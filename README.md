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

## Login

The admin account is the business email (`12shivasinghh@gmail.com`). Change the starting password
after the first login: **Settings → Change password**.

Only emails listed in the `allowed_users` table can see or create bills (enforced by Supabase Row
Level Security). To add a staff member, see the bottom of `supabase/schema.sql`.

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
| `supabase/schema.sql` | Database tables, security policies and functions |
| `vendor/` | supabase-js and html2pdf.js (bundled so the app does not depend on a CDN) |

## How GST is calculated

Each item has a price and a GST rate. "GST in price: Incl." means the price already contains GST
(like the original K.P. Enterprises bills: ₹48,050 with 5% GST → ₹45,761.90 + ₹2,288.10).
"Excl." adds GST on top. If the place of supply is Uttar Pradesh (09) the tax is split into
CGST + SGST; for any other state it is shown as IGST. You can also type the line **Amount**
directly and the unit price is worked out for you.
