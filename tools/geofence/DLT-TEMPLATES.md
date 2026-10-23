# Geofence walk-in reward: SMS setup (MSG91 + TRAI DLT)

Indian SMS needs every message registered on a DLT portal (Jio, Airtel, Vi, BSNL…) before it can be sent.
Do this once for GetKeepsake, then add the IDs in Vercel. Until then, walk-in rewards still work and the
customer sees the code on screen.

## 1. DLT registration (GetKeepsake as the business)
1. Register GetKeepsake as a **Principal Entity** on one DLT portal (e.g. Jio TrueConnect or Airtel DLT). You get an Entity ID.
2. Register a **Header (sender ID)**, 6 letters, e.g. `GKEEPS`.
   - Transactional or service header for the walk-in code.
   - Promotional header (6 digits, given by the operator) for blasts.
3. Register the **templates** below, exactly as written. `{#var#}` is DLT's variable; each variable can be up to 30 characters.

| Key | Category | Template text to register |
|---|---|---|
| checkin | Service Implicit | `Your walk-in reward {#var#} at {#var#}. Show code {#var#} at the counter. https://getkeepsake.in/b/{#var#} - GetKeepsake` |
| offer | Promotional | `{#var#}: {#var#} today. Show code {#var#} at the counter. https://getkeepsake.in/b/{#var#} - GetKeepsake` |
| comeback | Promotional | `{#var#} misses you! Visit this week and get {#var#}. https://getkeepsake.in/b/{#var#} - GetKeepsake` |
| newin | Promotional | `New at {#var#}: {#var#}. See it here: https://getkeepsake.in/b/{#var#} - GetKeepsake` |

The last variable is the shop page id (8–16 letters and numbers), because a DLT variable can only hold 30 characters. Whitelist `https://getkeepsake.in/b/` as a URL on the DLT portal.

## 2. MSG91
1. Create an MSG91 account, add the Entity ID and headers, and add each DLT template under **SMS → Templates**.
   Write the variables as `##var1##`, `##var2##`, `##var3##`, `##var4##` in the same order as the table.
2. Copy each MSG91 template ID.

## 3. Vercel environment variables
| Name | Value |
|---|---|
| `MSG91_AUTH_KEY` | Your MSG91 auth key |
| `MSG91_SENDER` | Your 6-letter header, e.g. `GKEEPS` |
| `MSG91_TPL_CHECKIN` | MSG91 template ID for **checkin** |
| `MSG91_TPL_OFFER` | MSG91 template ID for **offer** |
| `MSG91_TPL_COMEBACK` | MSG91 template ID for **comeback** |
| `MSG91_TPL_NEW` | MSG91 template ID for **newin** |
| `PRICE_SMS_PACK` | Optional. Price of an SMS pack in rupees (default 299) |
| `SMS_PACK_SIZE` | Optional. Credits in a pack (default 500) |

A blast template with no ID shows as "awaiting approval" in the dashboard and can't be sent.

## Rules the code already follows
- The customer ticks a consent box before giving their number; promotional SMS only goes to these subscribers.
- Promotional blasts only between 10 am and 9 pm India time, at most one blast per shop per day.
- One walk-in SMS per customer per shop per day (24-hour cooldown), so credits can't be drained.
- Customers can stop SMS from a shop on its page; owners can remove any number in the dashboard.
- Credits are taken atomically and refunded when MSG91 doesn't accept a message.
