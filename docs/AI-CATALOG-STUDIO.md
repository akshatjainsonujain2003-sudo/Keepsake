# AI Catalog Studio

Internal admin tool for turning menu/rate-card images into editable GetKeepsake business-page catalog entries.

## Files
- `shops/catalog.html` — upload, editable review table, JSON export, and publish UI.
- `api/catalog-ai.js` — admin-authenticated AI extraction and publishing endpoint.
- Uses existing `api/_db.js` and the current `customer-memory:<id>` Redis records. Published items use the existing business-page menu structure: `{ n, items: [{ n, p, d, b, i }] }`.

## Vercel setup
1. Add `OPENAI_API_KEY` to the Vercel project environment variables (Production and Preview as needed). This key stays server-side.
2. Confirm `ADMIN_KEY` and the existing Upstash/Redis environment variables are configured.
3. Optional: set `CATALOG_AI_MODEL` to a vision-capable model available to your OpenAI project. Default: `gpt-4.1-mini`.
4. Deploy the branch/merged changes. Open `/shops/catalog`.

## Workflow
1. Enter the admin key.
2. Select the business type and upload 1–6 clear JPG/PNG/WebP menu or service-rate-card images (up to 3.4 MB total after browser resizing).
3. Scan. The API asks the model for structured JSON, preserving visible names/prices and flagging low-confidence readings.
4. Edit category names, item names, descriptions, and prices. Remove unwanted rows or add missing rows. Export JSON if needed.
5. Paste the existing business page URL or its ID from `/b/<id>`, review the confirmation, and publish.

Publishing **replaces the current menu** for the target business page; it does not change the rest of the page's branding/contact details. Review all names and prices before publishing. The admin endpoint is protected by `ADMIN_KEY`; do not expose this key in public client-side code.

## Current scope / follow-up
- First version accepts image uploads. PDF import, rollback/restore, and a native link from the existing shop editor can be added after the first deployed test.
- Variants are preserved as part of the published item description because the current business-page renderer's catalog item schema does not have a dedicated variants field.
- Test on a non-production business page before using with a customer's live menu.
