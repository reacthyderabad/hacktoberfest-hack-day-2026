import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  if (!token) {
    return null
  }
  if (!posthogClient) {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    posthogClient = new PostHog(token, {
      host,
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}
