# K.P. ENTERPRISES — Billing App

Web billing application for **K.P. Enterprises** (Solar Energy | Sustainability), Sandila, Hardoi.

- 3D animated login page with the KPE logo
- Bills in the exact K.P. Enterprises format: item table, GST (CGST/SGST or IGST), amount in words, Paid / Balance
- **Download PDF**, **Print** (A4) and **Share** (WhatsApp / phone share sheet)
- **Signature & stamp** on every bill: draw or upload your signature, upload your rubber stamp or use the generated one
- Every bill is saved in **Supabase**: search, filter by date / unpaid, edit, record payments, export CSV
- Customers and products are remembered automatically for quick billing
- Dashboard with total sales, monthly sales chart and pending payments
- Works on phone, tablet and computer

## Run it

It is a static site — no build step.

**GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root. The app will be at
`https://kp-enter.github.io/KP-ENTERPRISES/`.

**Locally:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080.

## Login & team (use it from anywhere)

The app runs in any browser and saves straight to Supabase, so everyone with a login sees the same
bills from any phone, tablet or computer.

- The admin account is the business email (`12shivasinghh@gmail.com`). Change the starting password
  after the first login: **Settings → Change password**.
- **Team page (admin):** add a person with email + starting password, choose **Admin** or **Staff**,
  reset passwords, or remove access. Send them the app link — that's all they need.
- **Staff** can make and edit bills, record payments, manage customers & products.
  They cannot delete bills or change company details, signature, stamp or the team.
- Each bill shows who made it.
- **Install on a phone:** open the link → browser menu → *Add to Home screen*.

Security is enforced inside Supabase (Row Level Security), not just in the app: only emails in
`allowed_users` can read or write anything, and admin-only actions are checked by the database and
by the `manage-users` edge function.

For the "Forgot password?" email link to come back to the app, add the site URL in Supabase →
Authentication → URL Configuration (Site URL and Redirect URLs).

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell (login + app) |
| `css/login.css` | 3D login page |
| `css/app.css` | App layout, forms, tables, print rules |
| `css/invoice.css` | A4 bill layout |
| `js/config.js` | Supabase URL and publishable key |
| `js/utils.js` | GST maths, amount in words, Indian states, stamp generator |
| `js/invoice.js` | Bill renderer |
| `js/db.js` | Supabase data access |
| `js/app.js` | Pages: dashboard, new/edit bill, bills, customers, products, settings |
| `supabase/schema.sql` | Database tables, roles, security policies and functions |
| `supabase/functions/manage-users/` | Edge function used by the Team page to create / remove logins |
| `manifest.webmanifest`, `sw.js` | Lets phones install the app to the home screen |
| `js/hsn-search.js`, `data/hsn.json` | HSN/SAC directory and the search that fills codes automatically |
| `vendor/` | supabase-js and html2pdf.js (bundled so the app does not depend on a CDN) |

## Works offline

Each device keeps a copy of all bills, customers, products and settings (IndexedDB) and the app
files (service worker). With no internet you can still open the app, make and edit bills, print /
download PDFs and record payments. Changes wait in a queue and are sent to Supabase automatically
when the internet returns (also every minute, and when the app comes back to the screen); changes
from other devices are pulled in at the same time. The badge at the top shows *All saved*,
*Offline* or *N waiting to sync* — click it to sync now.

- Bills made **online** use the normal series (`KPE/0001`). Bills made **offline** use this
  device's own series (`KPE/D1-001`, `KPE/D2-001` …) so two offline devices can never clash.
- The first login on a device needs internet. Changing passwords and the Team page need internet.
- Logging out keeps unsynced changes on the device; they are sent at the next login there.

## Automatic HSN / SAC codes

The app carries the full official HSN directory (12,600+ goods codes, CBIC/WCO list with HS-2022
updates) and the SAC list for services in `data/hsn.json`. As you type an item name it fills the
best code and shows other likely codes as chips; 🔍 opens a full search. Everyday words and brand
names are understood ("Havells MCB" → 85362030, "submersible pump" → 84137010, "PVC pipe" → 3917…).
Solar items use a hand-checked list first. A saved product's HSN always wins, and anything you type
or pick yourself is kept. Rebuild the directory with `tools/build_hsn.py`.

The suggestion is a starting point — confirm unusual items with your CA.

## How GST is calculated

Each item has a price and a GST rate. "GST in price: Incl." means the price already contains GST
(like the original K.P. Enterprises bills: ₹48,050 with 5% GST → ₹45,761.90 + ₹2,288.10).
"Excl." adds GST on top. If the place of supply is Uttar Pradesh (09) the tax is split into
CGST + SGST; for any other state it is shown as IGST. You can also type the line **Amount**
directly and the unit price is worked out for you.
