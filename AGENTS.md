# Agent instructions

Use Bun as the runtime and package manager. Keep repository documentation in US English.

This is a static browser-only connector. Never introduce a server relay, telemetry, credential upload, permissive CORS, or a public backend listener. Preserve URL-fragment pairing, strict loopback endpoint validation, no-referrer requests, and CSRF-protected forms. Do not log private panel URLs or include real identities in tests.

Run `bun run check` before publishing. Deploy `public/` with GitHub Pages. Keep the canonical origin `https://ca.eduardoaugusto.work` synchronized with the main Codex Accounts backend. Preserve the existing local-panel fallback and document browser permission limitations.
