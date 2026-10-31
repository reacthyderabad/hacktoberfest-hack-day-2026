# Security Policy

## Supported versions

Elah is pre-1.0. Security fixes are made against the latest published release of each
package, currently `@elah/core`, `@elah/react`, `@elah/timeline` and `@elah/editor`
**0.6.x**, and `@elah/cli` **0.1.x**. Older versions are not patched; upgrade to the
latest release.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: open the repository's **Security** tab and choose
**Report a vulnerability** (https://github.com/elahlabs/elah/security/advisories/new). Include
the affected package and version, a description of the impact, and the smallest reproduction
you can. If that option is unavailable to you, open an issue that says only that you have a
security report and asks for a private way to send it, without details.

The headless render server (`elah serve`) is the part of the project most exposed to
untrusted input; see [`docs/deploy-render-server.md`](./docs/deploy-render-server.md) for its
security notes before deploying it.
