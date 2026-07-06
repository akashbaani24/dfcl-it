# DFCL-IT (Test System)

Barcode & Serial-based Stock Management System.

## Features

- **Company Setup**: Entity (multi-level), Department, Employee, UoM, Supplier, Category/Sub-Category, Item (Barcode + Serial), Item Serial Numbers, News Ticker
- **Purchase Module**: Requisition, Purchase & Approval, Purchase Return
- **Inventory Module**: All Entity Stock, My Entity Stock, Internal Transfer, Adjustment & Approval
- **Sales Module**: Sales, Sales Order Delivery, Sales Return, Sales Refund
- **Accounts Module**: Daily Expenses, Daily Receive (with type)
- **Reports Module**: Stock, Purchase, Sales, Accounts, Serial Status
- **User Authentication**: Login with User ID + Password
- **Role-Based Permissions**: Per-module View/Create/Edit/Delete/Update/Excel/PDF permissions
- **Entity-Level Access**: Users can only access entities assigned to them
- **Export**: Excel (CSV) + PDF export on all list pages

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM + SQLite (local) / Turso (production)
- Zustand (state management)
- SHA-256 password hashing with httpOnly cookie sessions

## Local Development

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Seed demo data
bun run seed

# Start dev server
bun run dev
```

Open http://localhost:3000

### Demo Logins

- **Admin**: `admin` / `admin123` (full access, all entities)
- **Sales**: `sales` / `sales123` (limited permissions, Dhaka Showroom only)

## Production Deployment

See [DEPLOY.md](./DEPLOY.md) for complete Vercel + Turso deployment guide.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Local dev: `file:./db/custom.db` — Production: `libsql://...` |
| `TURSO_DATABASE_URL` | Production only — Turso database URL |
| `TURSO_AUTH_TOKEN` | Production only — Turso auth token |

---

**Idea & Developed by**: Abdur Rahman Akash  
**WhatsApp & Contact**: 01534955065
