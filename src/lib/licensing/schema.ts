export type Tier = 'community' | 'professional' | 'team'

export interface LicenseFeatures {
  commercialUse: boolean
  tuiDiffViewer: boolean
  vscodeDapDebugger: boolean
  localPersistence: boolean
  cmakeIntegration: boolean
  sharedPreambleLibs: boolean
  prioritySupport: boolean
}

export interface LicenseSeat {
  userId: string
  email: string
  orgId: string | null
}

export interface LicenseSubscription {
  polarOrderId: string
  polarProductId: string
  interval: 'month' | 'year' | null
  trialEnd: string | null
}

export interface LicenseLimits {
  maxMachines: number | null
}

// Root schema — lives in Keygen license.metadata and in the cached .lic file
export interface LicenseMetadata {
  schema: 1
  tier: Tier
  features: LicenseFeatures
  seat: LicenseSeat
  subscription: LicenseSubscription
  limits: LicenseLimits
}

const FEATURES_BY_TIER: Record<Tier, LicenseFeatures> = {
  community: {
    commercialUse: false,
    tuiDiffViewer: false,
    vscodeDapDebugger: false,
    localPersistence: false,
    cmakeIntegration: false,
    sharedPreambleLibs: false,
    prioritySupport: false,
  },
  professional: {
    commercialUse: true,
    tuiDiffViewer: true,
    vscodeDapDebugger: true,
    localPersistence: true,
    cmakeIntegration: false,
    sharedPreambleLibs: false,
    prioritySupport: false,
  },
  team: {
    commercialUse: true,
    tuiDiffViewer: true,
    vscodeDapDebugger: true,
    localPersistence: true,
    cmakeIntegration: true,
    sharedPreambleLibs: true,
    prioritySupport: true,
  },
}

const MAX_MACHINES_BY_TIER: Record<Tier, number | null> = {
  community: null,
  professional: 5,
  team: 5,
}

export function buildLicenseMetadata(params: {
  tier: Tier
  userId: string
  email: string
  orgId: string | null
  polarOrderId: string
  polarProductId: string
  interval: 'month' | 'year' | null
  trialEnd: string | null
}): LicenseMetadata {
  return {
    schema: 1,
    tier: params.tier,
    features: FEATURES_BY_TIER[params.tier],
    seat: { userId: params.userId, email: params.email, orgId: params.orgId },
    subscription: {
      polarOrderId: params.polarOrderId,
      polarProductId: params.polarProductId,
      interval: params.interval,
      trialEnd: params.trialEnd,
    },
    limits: { maxMachines: MAX_MACHINES_BY_TIER[params.tier] },
  }
}
