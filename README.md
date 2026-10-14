# StayEase — Find your somewhere

A complete, multi-page travel booking **local demonstration** built with HTML, CSS and vanilla ES modules. No frameworks, package installation, bundler, API keys, or build step. All account, wishlist, review and booking data lives in the current browser's IndexedDB.

**This is not a secure production reservation service or a server backend.** Anyone with access to the browser can inspect or change its data and session state. Do not use real passwords, guest information or payment cards. A static GitHub Pages site cannot enforce server-side identity, authorization, rate limits, cross-device inventory, or payment processing. See `SECURITY.md` for the review, limitations and production requirements.

## Start in VS Code (recommended)

1. Extract `StayEase-Hotel-Booking.zip`.
2. Open the extracted **StayEase** folder in VS Code.
3. Install the **Live Server** extension by Ritwick Dey, if you do not already have it.
4. Right-click **index.html** and select **Open with Live Server**.
5. Sign in with the demo account below, or create a demo-only account.

Do not double-click the HTML files to run them as `file://`. ES modules and Web Crypto need an HTTP localhost server or HTTPS. Internet access loads Google Fonts, Font Awesome CSS, and Unsplash photos. Missing images fall back to a bundled illustration; system fonts are available offline. Data remains local. Use a recent Chrome, Edge, Firefox or Safari with IndexedDB and Web Crypto enabled.

Alternative, if Python is installed, from the StayEase directory:

```bash
python -m http.server 5500 --bind 127.0.0.1
```

Then visit **http://localhost:5500/index.html**. On some Windows installations, use `py` instead of `python`. This is a development server, not a production hosting configuration.

## Demo account

- Email: **demo@stayease.com**
- Password: **StayEaseDemo2026!**
- The sign-in screen has a **Fill demo credentials** button.
- These are public demo credentials, not a secret.
- New demo accounts require a 12–128 character password. Use an invented password that is not used elsewhere.
- Unchecked Remember me uses sessionStorage with a one-day expiration. Checked uses localStorage with a seven-day expiration. These are client-side UX sessions, not secure authentication tokens.

## Try the complete flow

1. Sign in and search for **Bali**, with future dates, two guests and one room.
2. Adjust budget, amenities or property type; compare prices and guest ratings.
3. Open a hotel, browse the lightbox, save it, and select a room.
4. Review the calculated nightly subtotal and 12% demo tax.
5. Continue to checkout with fictional guest details.
6. Use test card **4242 4242 4242 4242**, a future **MM/YY**, and CVV **123**.
7. Confirm. No money is charged, no network request is made, and no email is sent.
8. Open My Bookings, print an invoice or cancel a future reservation. Cancelled rooms become available again.
9. Change your profile with your current password; this invalidates all existing local demo sessions.

## Features

- Nine HTML pages: login/signup, home, search, hotel, checkout/confirmation, bookings, wishlist, profile and 404.
- Responsive layouts, mobile navigation, dark/light theme, reduced-motion support, keyboard controls, labeled forms, focus states, dialogs, skip link and live notices.
- First-load seed: **24 fictional hotels in 8 real cities**, three room types per hotel, three physical units per type (216 room units total), and 72 sample written reviews.
- Cities: Bali, Dubai, Istanbul, Paris, Karachi, Lahore, Islamabad and London. Bali is treated as a destination in the city selector.
- Unsplash stock imagery is illustrative and does not depict verified named properties. Hotel names, descriptions, prices, scores, review counts and testimonials are fictional demonstration content. Curated aggregate scores are separate from locally submitted reviews.
- Destination autocomplete via native datalist, dates, guest/room selectors, live filtering, sorting, skeletons, result counts and empty states.
- Three room categories, image lightbox, amenities, local wishlists and reviews restricted to completed local stays. A user's new review replaces their prior review for that hotel.
- Booking availability across all accounts in the same origin/browser database. Read/check/allocate/write is one IndexedDB read-write transaction, preventing overlapping allocations even across tabs in the same browser profile. Different browsers have independent inventory.
- A room type has three units. Reserve 1–3 rooms of one type per checkout; capacity is enforced. Stays run 1–30 nights. A departure and arrival on the same calendar date may use the same unit.
- Guest date and guest-count validation; mock payment checksum/expiry/CVV checks. Card input is held only in the form and cleared on success; it is never added to the booking record.
- Idempotent booking creation for repeated submissions with the same checkout request ID. Each fresh checkout has a new request ID.
- Upcoming includes in-progress stays; Completed means check-out date is today or earlier; Cancelled is separate. Dates follow the device calendar, not property-local time zones. Cancel before the check-in date. No real refunds or emails.
- Printable demo invoice, profile updates, current-password verification, salted PBKDF2-HMAC-SHA256 (600,000 iterations) using Web Crypto, and a bypassable browser-side login cooldown after five failed attempts for five minutes.
- Newsletter feedback saves a local subscription preference only, not an email address, and does not send email.

## Folder structure

```text
StayEase/
  index.html                  # Login / signup
  home.html
  search.html
  hotel.html
  checkout.html               # Checkout + confirmation
  bookings.html
  wishlist.html
  profile.html
  404.html
  css/
    style.css                 # Tokens, components and page layouts
    auth.css                  # Split-screen authentication layout
    responsive.css            # Tablet/mobile and responsive adaptations
  js/
    app.js                    # Routing, shell, home, theme and bootstrapping
    db.js                     # IndexedDB access and transactions
    data.js                   # Curated seed catalog and stock photo URLs
    auth.js                   # Demo sign-in, sign-up and session guards
    components.js             # Shared hotel cards and search form
    search.js                 # Filter/sort and availability-aware results
    hotel.js                  # Gallery, rooms, reviews and price preview
    booking.js                # Mock checkout, bookings and invoices
    profile.js                # Account editing
    utils.js                  # Safe DOM, validation, dates and password KDF
  assets/
    icons/favicon.svg
    images/fallback.svg
  tests/run-tests.mjs          # Optional Node-only logic/source tests
  README.md
  SECURITY.md
  TEST-REPORT.md
  _headers                    # Optional host response-header configuration
  .gitignore
  .nojekyll
```

No environment file or API key is needed. Do not add secrets to JavaScript or commit `.env` files. Browser-delivered code is public.

## IndexedDB data access

`db.js` exports `initDB`, `addUser`, `getUserByEmail`, `getUser`, `getHotels`, `getHotel`, `addBooking`, `getBookingsByUser`, `cancelBooking`, `getReviews`, `addReview`, `getWishlist`, `toggleWishlist`, `availability`, `currentUser`, `startSession`, and `updateUser`.

User-scoped operations derive the current user instead of accepting a caller-supplied user ID. This helps prevent accidental UI mixing; it cannot stop someone controlling client code or storage. The unique email index enforces normalized email uniqueness. Room price and totals are re-derived from the stored hotel record when the booking is created. Inventory and all financial records are demonstration data, never authoritative.

Data is scoped to origin (scheme, host and port). Changing your Live Server port, switching from localhost to 127.0.0.1, or deploying the site gives a new database. Clearing site data deletes local bookings and re-seeds the demo. Never delete browser data you wish to keep.

## Deploy to GitHub Pages

1. Create a new repository, e.g. `stayease-hotel-booking`.
2. Upload the **contents** of StayEase so `index.html` sits at the repository root, alongside `css`, `js`, and `assets`. Include `.nojekyll`.
3. Commit and push. No build command, npm install, or framework selection is needed.
4. Open **Settings → Pages → Build and deployment**.
5. Choose **Deploy from a branch**, select **main**, choose **/(root)**, and click **Save**.
6. Wait for Pages deployment, then open the HTTPS URL GitHub shows. Usually it is `https://YOUR-USERNAME.github.io/stayease-hotel-booking/`.
7. Use the demo account. Your local development data will not appear on the hosted origin.

All links are relative, so repository subpaths work. The custom `404.html` is included; for deeply nested unknown URLs, GitHub may resolve its relative assets under the missing path. Navigate to the repository's main URL in that case. A generic server may need configuration to serve `404.html` for missing routes.

GitHub Pages does not interpret `_headers` and does not give this project control of response headers. The HTML CSP meta policy is included, but frame protection and other response-only headers require a compatible host or reverse proxy. On Cloudflare Pages / a compatible static host, publish the project directory with no build command and verify the supplied `_headers` rules actually appear in HTTP responses. Headers are configuration, not proof of deployment enforcement.

## Verification

Optional logic/source tests, with Node 20 or newer:

```bash
node tests/run-tests.mjs
```

No packages are required for these shipped tests. The website itself does not require Node. See `TEST-REPORT.md` for executed checks and the outstanding real-browser checklist. Tests cannot guarantee the absence of defects or security vulnerabilities.

## Editing

Customize design tokens in `css/style.css`, breakpoints in `css/responsive.css`, and the catalog in `js/data.js`. Seed edits only affect a fresh database; development resets discard data. Use a database version upgrade and migration for persistent deployments. Source JavaScript and CSS are formatted and commented; nothing is minified.

## License and assets

Original project code is provided for your portfolio use and modification. Google Fonts (Inter and Playfair Display), Font Awesome, and Unsplash images remain subject to their respective providers' licenses and availability. No third-party executable JavaScript is loaded. Fonts, styles and photos make requests to those providers; no form values are included in those requests.
