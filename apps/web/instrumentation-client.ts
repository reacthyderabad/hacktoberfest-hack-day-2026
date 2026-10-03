import posthog from 'posthog-js'

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN

if (token) {
  posthog.init(token, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
    // Consent-gated: start opted out and honour Do-Not-Track. ConsentProvider
    // calls opt_in_capturing() once the visitor accepts.
    opt_out_capturing_by_default: true,
    respect_dnt: true,
  })
}

export { }
