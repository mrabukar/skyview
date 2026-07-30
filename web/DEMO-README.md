# Bubble Tea Palace — Frontend Demo (Skyview Coffee Ltd)

Client-facing demo of the café management system. This is a **copy of the
inventory frontend** running entirely on **mock data** — no backend, no
database. Every screen works; nothing is saved permanently.

## Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Login (demo)

Any email and password work:

- Any email (e.g. `admin@skyviewcoffee.co.ke`) → **Admin** view (all 4 branches)
- An email containing `manager` (e.g. `manager@x.com`) → **Branch Manager** view (Hub Karen)

## What's in the mock data

- 4 branches: Hub Mall – Karen, Runda Mall, One Stop Arcade – Langata, Mombasa City
- Menu items: Bubble Coffee, Iced Latte Boba Tea, Chai Boba Coffee, milk teas, fruit teas, matcha, waffles — organised in menu sections
- ~4 months of daily sales across all branches (KSh)
- Vendor purchases: Carrefour, Osterberg, Maasai Boba, Swiss Packaging, etc.
- Expenses from the real spreadsheet patterns: rent, salaries, service charge, transport, repairs, internet, promotional levy
- Reports/dashboards computed live from the mock sales and expenses

## Purpose

The client clicks through every screen and decides **which modules to keep or
remove** (the stated scope is sales + expenses; purchases/inventory/etc. are
included so removal decisions are made on real screens).

## What was changed vs the inventory frontend

| Area | Change |
|---|---|
| `service/client.ts`, `service/upload.ts` | All API calls routed to a local mock router |
| `service/mock/data.ts` | Skyview dataset (branches, menu, sales, expenses…) |
| `service/mock/handlers.ts` | Mock API: every `/api/*` route answered locally |
| `hooks/auth/*`, `lib/auth/proxy/auth.ts`, `lib/auth/session-refresh.ts` | Demo login (any credentials), no Better-Auth server |
| `app/globals.css` | Skyview palette: espresso `#3F201B`, amber `#F9A72A`, cream backgrounds (colors extracted from the company profile PDF) |
| `components/logo.tsx`, `public/logo-*.svg` | Bubble tea cup logo mark |
| `public/login_background.png` | Warm espresso/amber gradient |
| `lib/utils.ts` | Currency: `KSh` instead of `$` |
| `lib/page-title.ts`, `app/layout.tsx`, sidebar wordmark | "Bubble Tea Palace" branding |

To wire a real backend later, restore `service/client.ts` / `service/upload.ts`
and the auth files from `inventory/web` — everything else is unchanged.
