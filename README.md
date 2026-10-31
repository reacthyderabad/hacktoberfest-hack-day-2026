# Elah Studio AI

Elah Studio AI is a browser-based video editor built on the Elah frame-accurate editing engine. It combines a multitrack timeline and WebGL preview with an assistant that turns natural-language requests into reviewable editing plans.

AI-generated edits are validated and previewed before they are applied. Accepted operations are grouped into a single undoable timeline change. When no OpenAI API key is configured, the editor can use its built-in local planner.

## Capabilities

- Import media into a library and add clips to a multitrack timeline.
- Preview, play, seek, trim, split, move, and delete clips.
- Add text overlays and transitions, adjust clip speed, and change the project aspect ratio.
- Export video to MP4 in supported browsers.
- Request edits conversationally, review the proposed operations, and accept, reject, or refine the plan.
- Save project data locally in the browser.
- Use optional Supabase services and database schema for project and AI-edit persistence.

## AI Editing

The assistant accepts a natural-language request and produces a structured plan based on the current project context. The plan is checked against the project before it is shown for review. No timeline changes are made until the user accepts the plan; an accepted plan is applied as one undoable action.

With `OPENAI_API_KEY` configured, requests are handled by the server-side AI route. Without it, the local planner provides supported editing operations without requiring an external API.

## Technology

| Area | Stack |
| --- | --- |
| Editing engine | `@elah/core`, WebGL2, WebCodecs |
| Timeline and React bindings | `@elah/timeline`, `@elah/react`, `@elah/editor` |
| Web application | Next.js 16, React 19, Tailwind CSS |
| AI | OpenAI API with a local planner fallback |
| Optional persistence | Supabase, PostgreSQL, row-level security |
| Browser storage | IndexedDB and local project storage |

## Requirements

- Node.js and npm
- A modern browser with WebGL2 support
- An OpenAI API key only if you want to use the hosted AI planner

## Quick Start

```bash
git clone https://github.com/VorugantiRahul/xyz.git
cd xyz
npm install
```

Copy `.env.example` to `apps/web/.env.local` and add configuration as needed. The editor can run without any API keys; add `OPENAI_API_KEY` to enable the hosted AI planner.

```bash
npm run dev --workspace=apps/web
```

Open [http://localhost:3001/editor](http://localhost:3001/editor).

The development app resolves the Elah packages directly from source, so no separate package build is needed to start the dev server. The web production build runs the package build step automatically.

## Configuration

All values are optional. Configure only the services you plan to use.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables the hosted AI planner. Keep this server-side. |
| `OPENAI_MODEL` | Overrides the AI model; defaults to `gpt-4o-mini`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase administration. Never expose this to the browser. |
| `PIXABAY_API_KEY` | Optional Pixabay media search. |
| `PEXEL_API_KEY` | Optional Pexels media search. |
| `FREESOUND_API_KEY` | Optional Freesound audio search. |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | Optional PostHog analytics. |

### Supabase

1. Create a Supabase project.
2. Run [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) in the Supabase SQL Editor.
3. Add the project URL and anonymous key to `apps/web/.env.local`.
4. Add the service-role key only when a server-side feature requires it. Never prefix it with `NEXT_PUBLIC_`.

The repository includes the schema and server/client helpers. The sign-in UI and complete account workflow are not currently implemented.

## Development Commands

```bash
# Start the web app
npm run dev

# Run tests across the configured workspaces
npm test

# Type-check all workspaces
npm run typecheck

# Build the web app for production
npm run build --workspace=apps/web
```

The production build requires the internal packages to be built first; the web workspace's `prebuild` script handles this automatically.

## Repository Layout

```text
apps/web/       Next.js editor and web experience
packages/core/  Timeline engine, resolver, playback, and rendering
packages/react/ React bindings and hooks
packages/timeline  Timeline user interface
packages/editor Editor composition and public API
supabase/       Database migrations
```

## Current Limitations

- Supabase authentication UI and the complete account workflow are not implemented.
- Transcription, SRT import, color grading, stabilization, chroma key, and generative audio are not available through the current editing engine.
- Large media files can be slow to process in a browser; compressed H.264 MP4 is recommended for smoother editing.
- MP4 export depends on browser support for the required WebCodecs APIs.

## Contributors

- [Yashwanthkumar-68](https://github.com/Yashwanthkumar-68)
- [yashwanth-p219](https://github.com/yashwanth-p219)
- [nagachaitanyaracharla](https://github.com/nagachaitanyaracharla)
