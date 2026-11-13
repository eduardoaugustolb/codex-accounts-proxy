# Codex Accounts local dashboard connector

Static frontend at **https://ca.eduardoaugusto.work** for the local [Codex Accounts](https://github.com/eduardoaugustolb/codex-accounts) backend. GitHub Pages hosts assets only. There is no relay, cloud backend, analytics, or credential upload.

## Connect

Install or update Codex Accounts, restart its backend, then run `codex-accounts panel`. The command opens this frontend with the private local endpoint in a URL fragment. The browser consumes and removes that fragment before connecting; fragments are not sent in HTTP requests to Pages. The paired endpoint is kept in session storage for this tab and cleared by Disconnect. Backend restarts rotate its address and require pairing again.

Alternatively, paste the private local address printed by `codex-accounts status` into the connection form. Allow local/loopback network access when your browser asks. The backend must run on the same computer as the browser. If the browser blocks local connections, use the existing local panel directly; do not disable browser security settings.

The frontend fetches the backend-rendered dashboard directly and submits forms to that same local endpoint. The backend allows exactly `https://ca.eduardoaugusto.work` through CORS while retaining its unguessable path, CSRF tokens, loopback-only binding, and idle-turn guards. The UI includes local account controls, quotas, preferences, and photo uploads. Data refresh pauses when the tab loses focus or a form/confirmation is open.

The hosted origin is trusted to operate the paired local dashboard. Protect repository publishing access accordingly. Never post private local panel URLs in issues. Signing out of Codex and disconnecting this tab are different actions.

## Development and deployment

Use Bun 1.4.4. `bun run check` parses and bundles the browser script into a temporary directory; the site itself is buildless. Pushes to `main` deploy `public/` through GitHub Actions. `public/CNAME` declares `ca.eduardoaugusto.work`. In Cloudflare, use a DNS-only CNAME from `ca` to `eduardoaugustolb.github.io`.

Browser local-network permission behavior differs by browser/version. Automated checks do not replace browser permission testing.

Interface icons are vendored regular-weight SVGs from `@phosphor-icons/core` 2.1.1 (MIT); their license is retained in `public/icons/LICENSE`. The generated Codex Accounts logo remains a separate brand asset. The CLI now emits a compact paired link (`#PORT.CAPABILITY`); the connector also accepts older `#connect=...` links.

## Developer workflow

Run `bun install --frozen-lockfile` to install Biome and enable the repository's pre-commit hook. Existing custom hook paths are preserved. `bun run format`, `bun run lint`, and `bun run check:style` enforce the shared two-space style. The hook checks staged index content without writing files or restaging unstaged edits. Vendored Phosphor SVGs are excluded. GitHub Actions runs the same style check before publishing.
