// On-demand endpoint (NOT prerendered) — ships as a Vercel serverless function.
// It fetches the five upstream status pages server-side, normalizes their wildly
// different shapes (BetterStack JSON / Atlassian Statuspage v2 / incident.io RSS)
// into one uniform payload, and caches at the edge. The browser only ever talks
// to this same-origin route, so there is no CORS problem and no client-side XML
// parsing. See status.codexx-dtdk.com plan for the full rationale.
import type { APIRoute } from "astro";

export const prerender = false;

type State =
  | "operational"
  | "maintenance"
  | "degraded"
  | "down"
  | "unknown";

// Severity ranking for the overall banner (worst wins). `unknown` sits above
// maintenance but below a confirmed degradation — a provider we can't reach must
// not claim "all operational", yet must not fake an outage either.
const SEVERITY: Record<State, number> = {
  operational: 0,
  maintenance: 1,
  unknown: 2,
  degraded: 3,
  down: 4,
};

type Kind = "betterstack" | "statuspage" | "incidentio-rss";

interface Source {
  id: string;
  name: string;
  category: string;
  /** Machine-readable endpoint we query. */
  endpoint: string;
  /** Human status page we link visitors to when something is wrong. */
  officialUrl: string;
  kind: Kind;
}

interface ServiceStatus {
  id: string;
  name: string;
  category: string;
  state: State;
  detail: string;
  officialUrl: string;
}

const SOURCES: Source[] = [
  {
    id: "keygen",
    name: "Keygen",
    category: "Licensing & distribution",
    endpoint: "https://status.keygen.sh/index.json",
    officialUrl: "https://status.keygen.sh/",
    kind: "betterstack",
  },
  {
    id: "polar",
    name: "Polar",
    category: "Billing & checkout",
    endpoint: "https://status.polar.sh/index.json",
    officialUrl: "https://status.polar.sh/",
    kind: "betterstack",
  },
  {
    id: "tally",
    name: "Tally",
    category: "Feedback & bug forms",
    endpoint: "https://status.tally.so/index.json",
    officialUrl: "https://status.tally.so/",
    kind: "betterstack",
  },
  {
    id: "resend",
    name: "Resend",
    category: "Transactional email",
    endpoint: "https://resend-status.com/feed.rss",
    officialUrl: "https://resend-status.com/",
    kind: "incidentio-rss",
  },
  {
    id: "github",
    name: "GitHub",
    category: "Code & release hosting",
    endpoint: "https://www.githubstatus.com/api/v2/status.json",
    officialUrl: "https://www.githubstatus.com/",
    kind: "statuspage",
  },
];

// BetterStack aggregate_state → our state. Unknown strings fall through to
// "degraded" (something non-nominal we don't have an explicit bucket for).
function fromBetterStack(raw: string | undefined): { state: State; detail: string } {
  const s = (raw ?? "").toLowerCase();
  switch (s) {
    case "operational":
      return { state: "operational", detail: "All systems operational" };
    case "maintenance":
    case "under_maintenance":
      return { state: "maintenance", detail: "Maintenance in progress" };
    case "degraded":
    case "partial_outage":
    case "partial_downtime":
      return { state: "degraded", detail: "Degraded performance" };
    case "downtime":
    case "major_outage":
      return { state: "down", detail: "Service outage" };
    default:
      return s
        ? { state: "degraded", detail: `Reported state: ${raw}` }
        : { state: "unknown", detail: "No status reported" };
  }
}

// Atlassian Statuspage v2 status.indicator → our state (GitHub).
function fromStatuspage(
  indicator: string | undefined,
  description: string | undefined,
): { state: State; detail: string } {
  const detail = description || "";
  switch ((indicator ?? "").toLowerCase()) {
    case "none":
      return { state: "operational", detail: detail || "All systems operational" };
    case "minor":
      return { state: "degraded", detail: detail || "Minor service issues" };
    case "maintenance":
      return { state: "maintenance", detail: detail || "Maintenance in progress" };
    case "major":
      return { state: "down", detail: detail || "Major service outage" };
    case "critical":
      return { state: "down", detail: detail || "Critical service outage" };
    default:
      return { state: "unknown", detail: detail || "No status reported" };
  }
}

// incident.io only exposes RSS for Resend, so we infer current health from the
// feed. Items are historical incidents/maintenances; the newest one (by pubDate)
// reflects the latest activity. If its most recent update is Resolved/Completed
// everything is nominal; otherwise an incident is live. Heuristic by necessity —
// there is no aggregate_state field in RSS.
function fromIncidentRss(xml: string): { state: State; detail: string } {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/g)].map((m) => m[0]);
  if (items.length === 0) {
    return { state: "operational", detail: "No incidents reported" };
  }

  const parsed = items.map((item) => {
    const title = decodeXml(pick(item, "title"));
    const pub = pick(item, "pubDate");
    const desc = stripHtml(decodeXml(pick(item, "description")));
    const ts = pub ? Date.parse(pub) : NaN;
    return { title, ts: Number.isNaN(ts) ? 0 : ts, desc };
  });

  parsed.sort((a, b) => b.ts - a.ts);
  const latest = parsed[0];

  // First status keyword in the latest update (updates are newest-first).
  const resolved = /\b(resolved|completed)\b/i;
  const active = /\b(investigating|identified|monitoring|in progress|degraded|outage|disruption)\b/i;
  const scheduled = /\b(scheduled)\b/i;

  const haystack = `${latest.title} ${latest.desc}`;

  if (resolved.test(latest.desc) && !active.test(latest.desc)) {
    return { state: "operational", detail: "No active incidents" };
  }
  if (active.test(haystack)) {
    return { state: "degraded", detail: latest.title || "Active incident" };
  }
  if (scheduled.test(haystack)) {
    return { state: "maintenance", detail: latest.title || "Scheduled maintenance" };
  }
  // Newest item has no resolution marker and no clear active marker — treat the
  // absence of a resolution as a live incident rather than assume health.
  return resolved.test(latest.desc)
    ? { state: "operational", detail: "No active incidents" }
    : { state: "degraded", detail: latest.title || "Possible active incident" };
}

function pick(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function resolveSource(src: Source): Promise<ServiceStatus> {
  const base = {
    id: src.id,
    name: src.name,
    category: src.category,
    officialUrl: src.officialUrl,
  };
  try {
    const res = await fetch(src.endpoint, {
      headers: { "user-agent": "codexx-status/1.0 (+https://status.codexx-dtdk.com)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ...base, state: "unknown", detail: `Upstream returned HTTP ${res.status}` };
    }

    if (src.kind === "incidentio-rss") {
      const { state, detail } = fromIncidentRss(await res.text());
      return { ...base, state, detail };
    }

    const json: any = await res.json();
    if (src.kind === "betterstack") {
      const { state, detail } = fromBetterStack(json?.data?.attributes?.aggregate_state);
      return { ...base, state, detail };
    }
    // statuspage
    const { state, detail } = fromStatuspage(json?.status?.indicator, json?.status?.description);
    return { ...base, state, detail };
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "unreachable";
    return { ...base, state: "unknown", detail: `Status provider ${reason}` };
  }
}

function overall(services: ServiceStatus[]): { state: State; title: string; sub: string } {
  const worst = services.reduce<State>((acc, s) => (SEVERITY[s.state] > SEVERITY[acc] ? s.state : acc), "operational");
  const bad = services.filter((s) => s.state === "degraded" || s.state === "down");
  const unknown = services.filter((s) => s.state === "unknown");
  const maint = services.filter((s) => s.state === "maintenance");

  const names = (list: ServiceStatus[]) => list.map((s) => s.name).join(", ");

  switch (worst) {
    case "operational":
      return { state: "operational", title: "All systems operational", sub: "All watched dependencies are reporting normal service." };
    case "maintenance":
      return { state: "maintenance", title: "Maintenance in progress", sub: `Scheduled maintenance: ${names(maint)}.` };
    case "unknown":
      return { state: "unknown", title: "Status partially unavailable", sub: `Couldn't reach: ${names(unknown)}. Other dependencies operational.` };
    case "degraded":
      return { state: "degraded", title: "Some systems degraded", sub: `Affected: ${names(bad)}.` };
    case "down":
      return { state: "down", title: "Major outage", sub: `Affected: ${names(bad)}.` };
  }
}

export const GET: APIRoute = async () => {
  const settled = await Promise.allSettled(SOURCES.map(resolveSource));
  const services = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          id: SOURCES[i].id,
          name: SOURCES[i].name,
          category: SOURCES[i].category,
          officialUrl: SOURCES[i].officialUrl,
          state: "unknown" as State,
          detail: "Status check failed",
        },
  );

  const body = {
    checkedAt: new Date().toISOString(),
    overall: overall(services),
    services,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Edge cache absorbs the 60s client poll: upstreams hit ~once/min site-wide.
      "cache-control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
};
