# Keepsake

NFC and QR keepsakes for the people you love. Customers design for free, then pay once to activate (until Razorpay keys are added, everything goes live for free; see Notes):

- **Template card** (studio) or **Custom website** (builder) in one of two designed templates, **Wildflower** or **Candlelit**, with the couple's own photos, Spotify song, letter, story, moments and more
- delivered **Digital** (link, QR, NFC-ready link), or as a printed **Photo frame with QR** or **Photo frame with NFC**, printing either their photo or their card design
- with an optional **password** that's checked on the server before anything is shown

No app is needed to open a keepsake.

Live: https://keepsake-h4ed.vercel.app

## Project layout

```
*.html          Pages (served without .html thanks to cleanUrls)
  index         Home
  designs       Card theme gallery and the two website designs
  business      Paused: /business redirects to / (kept for when shops return)
  contact       Lead form
  login         Shop key log in (paused, hidden from menus and search)
  account       Customer account
  reset-password
  studio        Template card editor; also shows cards at /c/:id and /m/:id
  builder       Website editor with a live preview of the chosen design
  site          Public custom website at /s/:id (loads the template with the saved content)
templates/      Designed website templates, filled from saved data
  wildflower    Light, floral, scrapbook style
  candlelit     Dark, candlelit, wax-seal opening
  dashboard     Customer's saved memories: live or not, edit, activate
  admin         Admin panel: paid orders, NFC cards to ship, enquiries, shops
assets/         Theme images (name.webp), thumbnails (t-name.webp), CSS and JS
  ks-checkout.v1.js    Shared checkout, password field and unlock screen
  ks-templates.v1.js   Template kit: demo content, builder fields, safe rendering helpers
  wildflower/, candlelit/   Cut-out decorations for the templates
  site-render.v1.js    Older section-based websites (kept for sites saved before the templates)
  site-themes.v1.css   Their four themes
api/            Vercel serverless functions
  _db.js        Tiny Upstash / Vercel KV REST client (shared helper)
  _pay.js       Prices and Razorpay helpers (shared helper)
  admin.js      Orders, shipping, enquiries and shop keys
  checkout.js   Razorpay checkout: create order, verify payment
  razorpay-webhook.js  Activates paid cards even if the customer closes the page
  card.js       Save and load cards
  customer-auth.js, customer-memories.js   Customer accounts
  img.js        Image storage
  lead.js       Contact form leads
  shop.js       Shop key login
  shorten.js    Short links (only for this site's own URLs)
  sitemap.js    /sitemap.xml
  robots.js     /robots.txt
vercel.json     Rewrites, security headers, asset caching
```

There is no build step and no npm dependencies.

## Deploy on Vercel

1. Import this repo at vercel.com/new (Framework: Other, no build command).
2. Add a Redis store (Upstash via the Vercel Marketplace). Its REST URL and token env vars are picked up automatically.
3. Set these environment variables:
   - `ADMIN_KEY`: password for the admin panel
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: for customer password reset emails
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: from Razorpay Dashboard → Account & Settings → API Keys
   - `RAZORPAY_WEBHOOK_SECRET`: a secret you choose when adding the webhook below
   - Optional prices in rupees: `PRICE_TEMPLATE` (99), `PRICE_WEBSITE` (299), `PRICE_FRAME_QR` (399), `PRICE_FRAME_NFC` (599). Frames are added on top of the product price; adding a frame to an active keepsake costs only the frame.
4. In Razorpay Dashboard → Webhooks, add `https://<your-domain>/api/razorpay-webhook` with the events `payment.captured` and `order.paid`, using the same webhook secret. Keep payment capture set to automatic.
5. Use the production domain (not a preview URL) for QR codes and NFC tags. If scanners hit a Vercel login, turn off Deployment Protection in Project Settings.

## Notes

- **Free mode:** while `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are missing, new cards and websites go live straight away and photo-frame offers are hidden. Adding the keys turns the paywall on with no code change.
- Templates open with `?preview=1` in the builder and update live via `postMessage`. Customer text is only set with `textContent`, and links are checked before use.
- The template demos use Figma-hosted photos that expire on 20 October 2026; replace them with files in `assets/` before then.
- New cards start inactive (once payments are on). Only their owner can preview them until paid. Cards saved before payments were added stay live.
- Only files in `api/` run as server functions. Files elsewhere are served as static files.
- Every page loads images, CSS and JS from `/assets/`, which is cached for a year. When changing an asset, rename it so visitors get the new version.
