// codegen's transactional email. The HTML templates + Resend wiring are shared
// (@codexx/web/email); this file only binds codegen's brand. Other licensed
// DTDK tools bind their own.
import { createEmailer } from '@codexx/web/email'

export const { sendActivationEmail, sendPortalLinkEmail } = createEmailer({
  product: 'codegen',
  label: 'Codegen',
  from: 'Codegen <noreply@codexx-dtdk.com>',
  // Brand/footer link → landing site. appOrigin → codegen app (where /activate
  // lives, on its own subdomain).
  siteUrl: 'https://landing.codexx-dtdk.com',
  appOrigin: 'https://codegen.codexx-dtdk.com',
})
