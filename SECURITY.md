# Security Policy

`edit-ascii-diagram` runs entirely in your browser. There is no server component and no
account system, so the diagram you paste or edit is never uploaded. Most classic web
vulnerabilities (server-side injection, auth bypass, data exfiltration via a backend)
do not apply.

We still take client-side security seriously — XSS, supply-chain issues in
dependencies, a service worker caching bug, or anything that could cause your diagram
text to leave your device (including via a shared/URL-encoded state — none of the
input is ever put in the URL).

## Reporting a vulnerability

Please report suspected vulnerabilities privately, not in a public issue:

- Email: **security@runlocally.app**
- Or use GitHub's private vulnerability reporting (Security → Report a vulnerability).

Include what you found, steps to reproduce, and the impact you expect. We aim to
acknowledge within a few days. Please give us a reasonable window to ship a fix
before public disclosure.

## Scope

In scope:

- This repository's source and the deployed site.
- The parser/grid engine, the service worker, and the PWA manifest.
- Anything that could send pasted/edited diagram text off the device.

Out of scope:

- Findings that require a compromised device or a malicious browser extension.
- Missing hardening headers that have no concrete exploit.

Thank you for helping keep users safe.
