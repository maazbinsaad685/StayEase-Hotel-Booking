# StayEase security review

Review date: 13 October 2026. Scope: newly generated static project source and local demonstration logic. This is a source/configuration review with automated logic checks, **not a penetration test, certification, full production audit, or guarantee of security**.

## Release status

**Suitable as a local portfolio demonstration. Not approved for real accounts, payments, guest data, or real hotel inventory.**

A static browser application cannot hide API secrets or make its own data and authorization decisions trustworthy. IndexedDB is a client-side data store, not a remote secure database. A visitor can change JavaScript, database records, localStorage, sessionStorage, the device clock, or the displayed prices. Separate devices do not share reservations.

## Scope and findings

| Area | Implemented / checked | Remaining limitation |
| --- | --- | --- |
| Password storage | Web Crypto PBKDF2-HMAC-SHA256, 600,000 iterations, random 128-bit salt, 256-bit output. No plaintext password field in stored account records. | Hashes are readable and replaceable by someone controlling the browser. Use trusted server-side password verification for real accounts. |
| Single SHA-256 request | Deliberately strengthened to salted PBKDF2 using SHA-256. | A single fast SHA-256 digest is unsuitable for password storage. |
| Authentication | Password verification; expiring local sessions; protected-page guard; logout; current-password verification on profile edits; session-version invalidation on profile updates. | All checks are client-side and bypassable. There are no HttpOnly session cookies, server session store, verified emails, password recovery, MFA, or identity provider. |
| Ownership | DAL scopes bookings and wishlists to current user and checks booking ownership before cancellation. Reviews require a completed local stay. | This prevents accidental UI cross-account access, not malicious access to the browser database. No server-enforced row policies exist. |
| Double booking | Room availability and insertion share one IndexedDB read-write transaction. All local users' active reservations are considered. Adjacent stays are allowed. Request IDs prevent duplicate writes from the same checkout. | Applies only to the same origin/browser profile. It does not coordinate different browsers or devices. |
| Input / XSS | User text is rendered with text nodes / textContent. No innerHTML assignment, eval, dynamic Function, or inline event handlers. Names, email, length, dates, counts, ratings and payment formats are validated. User input is not used as arbitrary navigation or image URLs. | Validation is bypassable and must be repeated on a server. CSP alone is not a complete defense against XSS. |
| Payment data | Form-only test card validation. No PAN, expiry, CVV, or cardholder name fields are added to booking storage. No network payment API exists. | Do not enter real card data. This is not PCI-compliant payment processing. |
| Rate limiting | Five failed logins trigger a five-minute per-email local cooldown. | Users can clear or edit it. Real rate limiting must run on a trusted server / edge and must cover signup, login, recovery, reviews, and booking mutations. |
| API keys / environment | No API keys, credentials for external services, environment files, or private server secrets are required or included. Demo credentials are intentionally public. `.gitignore` excludes common secret files. | No existing project or deployment environment was supplied. External secrets and environment values were not inspected. Browser code cannot keep a key secret. |
| Admin routes | No admin UI, admin role, or admin route exists. | There are no admin authorization controls to verify. Introduce server-side role checks before adding administration. |
| API endpoints / CORS | No application API or backend endpoints exist. CSP disallows fetch/XHR/WebSocket connections with connect-src 'none'. No permissive CORS configuration is included. | CORS is not an authorization system. A future API requires explicit allowed origins and server-side authentication/authorization. |
| Response headers | `_headers` supplies CSP, frame-ancestors, X-Frame-Options, nosniff, referrer policy, permissions policy, and HSTS for compatible HTTPS hosts. All HTML pages contain a restrictive CSP meta policy. | No deployment was made or inspected. GitHub Pages does not apply `_headers`. frame-ancestors cannot be enforced in a CSP meta tag; configure it as a real response header. Verify deployed responses. |
| Dependencies | No application JS dependencies, frameworks, package manager, build system, source maps, or third-party executable scripts. Font Awesome stylesheet is pinned to 6.7.2. Inter / Playfair Display and Unsplash photography are external resources. | No claim that every third-party resource is latest or independently audited. Google Fonts CSS and Unsplash availability are externally controlled. Review or self-host assets for stricter production supply-chain needs. |
| Debug / exposed files | No application debug toggle, debug logging, backend trace output, secret files, or generated database dump. Source and documentation are intentionally downloadable. | A static host publishes its served files. Never upload `.env`, credentials, private keys, database exports or private documents. |
| Git history | New ZIP source only; no prior repository or Git history was provided or present in the project. | A historical secret scan could not be performed. Scan the actual repository before publishing; rotate any leaked secret rather than just deleting it. |
| Data privacy | Guest fields are local-only; the newsletter stores only a boolean preference. No analytics, tracking SDK, or outbound application API calls. Referrer policy is no-referrer. | Third-party asset providers still receive normal asset requests (e.g. IP/user-agent). Local guest data is neither server-protected nor encrypted at rest by the app. |

## Checks actually executed

- JavaScript syntax checks in ES-module mode across all application modules.
- Ten self-contained Node logic/source tests covering catalog structure, dates, price arithmetic, overlaps, filters/sorts, validation, password derivation, mock cards, and unsafe HTML/script sinks.
- Twelve IndexedDB-emulation and simulated-DOM tests, including simultaneous conflicting reservations, request idempotency, account-scoped data, cancellation, password-required updates, session invalidation, safe text rendering, and asynchronous wishlist events.
- Nine simulated-DOM page-render checks for expected content, unique DOM IDs, no lingering loading screen, and image alt attributes.
- Source and archive inspection for unexpected secret-bearing artifacts and unsafe sinks; not an exhaustive commercial secret scanner or vulnerability scanner.

No real-browser visual/keyboard audit, live response-header/CORS audit, network penetration test, deployment audit, or historical Git scan was performed. See `TEST-REPORT.md`.

## What a real production version needs

1. A trusted backend and durable server database, with authenticated endpoints and authorization on every read/write. Derive identity from verified server sessions, never supplied user IDs.
2. Server-side password hashing (prefer an established authentication service or well-reviewed Argon2id implementation), unique salts, secure recovery, email verification, and appropriate MFA. Use Secure/HttpOnly/SameSite session cookies with rotation, revocation and CSRF protection as appropriate.
3. Cross-device inventory transactions and database constraints that prevent conflicting room allocations. Prices, taxes, availability, cancellation eligibility and refund rules must be recomputed from authoritative records.
4. Edge/server rate limits, abuse monitoring, safe logs, request-size bounds and validated schemas. Separate admin roles and authorization at the server, with audit logs.
5. Secrets held exclusively in a server secret manager or private environment, narrow CORS allowlists, tested HTTPS response headers, and production error handling.
6. A hosted payment provider's checkout or tokenized components. Never store raw payment card data or CVV in this application. Verify payment webhooks server-side and handle retries idempotently.
7. Backup/recovery, retention/deletion policies, monitoring, dependency maintenance, actual repository secret scanning, accessibility testing, and an independent security review before real launch.

Adding these changes requires changing the browser-only architecture. Simply hosting this ZIP, obfuscating JavaScript, adding a frontend `.env`, or hiding a navigation link does not provide these controls.

## References consulted

- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- MDN CSP implementation guidance: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP
- MDN frame-ancestors HTTP header directive: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
