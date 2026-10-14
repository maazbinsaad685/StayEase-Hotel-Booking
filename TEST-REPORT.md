# Verification report

Date: 13 October 2026

## Results

| Check | Result | Scope |
| --- | --- | --- |
| ES module syntax | Passed | Every file in `js/`, parsed explicitly as an ES module |
| Shipped logic/source suite | 10 passed | `node tests/run-tests.mjs`, no dependency installation needed |
| Data-layer / safe DOM suite | 12 passed | Fake IndexedDB and a simulated DOM in the authoring environment; test packages are not shipped or required by the website |
| Page construction | 9 passed | Auth, home, search, hotel, checkout, bookings, wishlist, profile, 404; simulated DOM only |
| Catalog | Passed | 24 hotels; 8 destinations; 3 room types × 3 physical room units per hotel; 72 sample written reviews |
| Source consistency | Passed | Local HTML asset references and relative JS imports checked; no unsafe HTML sinks or remote executable JS |
| Source readability | Formatted | CSS and JavaScript delivered unminified; formatting tools are authoring-only |
| ZIP package | Checked | Folder structure retained; no authoring dependencies, secrets, databases or Git history included |
| Real browser and viewport inspection | Not performed | Browser QA tooling was unavailable; no screenshot, rendering, keyboard or cross-browser claim is made |
| Production penetration test | Not performed | No real backend or deployment exists |

## Behaviors covered

- Valid date ranges and rejection of past dates, impossible calendar dates, zero/reversed stays, and stays over 30 nights.
- Exact totals for multiple rooms and nights, with a single 12% tax calculation.
- Overlap detection and back-to-back reservations.
- Combined destination, budget, amenities, stars, property type and rating filters; sort order.
- Account input bounds, normalized emails, salted password derivation and repeat verification.
- Valid mock payment checksum, expiry and CVV, including rejection paths.
- First-load catalog and demo account creation; unique emails under the IndexedDB index.
- Concurrent reservations for the same room pool: one allocation succeeds and a conflicting allocation fails.
- Idempotent repeated checkout requests and recomputation of prices instead of accepting passed totals.
- User-scoped booking and wishlist access through the data layer; cross-account cancellation rejection.
- Cancellation releases units for a future stay.
- Reviews blocked before a completed stay.
- Profile edit requires current password and invalidates prior local sessions.
- Hostile strings are inert text, not markup; the async wishlist handler does not use a cleared event target.
- Pages construct expected content with unique IDs and image alt text.

These checks use emulated IndexedDB and DOM APIs where noted, not a real browser. They do not establish production-grade security, verify actual browser layout, or guarantee bug-free behavior.

## Real-browser acceptance checklist before showcasing

1. Run with Live Server / localhost; sign in and sign up; trigger all inline validation messages.
2. Verify sign-out, remembered sessions, profile password changes and expiry, including another open tab and browser Back.
3. Use Tab / Shift+Tab / Enter / Escape throughout, including account menu, mobile menu, password toggle and lightbox. Check focus, zoom at 200%, screen-reader labels, and dark/light contrast.
4. Inspect at widths 360, 768, 1024 and 1440 pixels and with reduced motion enabled. Check no horizontal overflow and check how long hotel/user names wrap.
5. Search and filter in all eight destinations; check invalid dates and no-results states.
6. Reserve a room with the test card; inspect step 2, confirmation, My Bookings, and print preview. Verify payment fields are absent from IndexedDB records.
7. Open two tabs, select overlapping dates and attempt to reserve the last units. Confirm one conflicting attempt fails. Try departure/arrival on the same day and nonoverlapping dates.
8. Test cancelling future stays, completed/cancelled tabs, completed-stay reviews and duplicate checkout submission handling.
9. Test external asset failures; verify image fallbacks, readable system fonts, and a usable layout without Font Awesome.
10. On the final host, inspect actual response headers and developer-console CSP errors. `_headers` is not honored by GitHub Pages. Do not treat local checks as deployed-header verification.
