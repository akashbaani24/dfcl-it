# 🚀 DFCL-IT (Test System) — Deployment Guide

আপনার প্রজেক্ট Vercel + Turso-তে deploy করার সম্পূর্ণ গাইড।

---

## 📋 যা যা লাগবে

1. **GitHub account** — কোড রাখার জন্য
2. **Vercel account** (https://vercel.com) — deploy করার জন্য (GitHub দিয়ে login করতে পারেন)
3. **Turso account** (https://turso.tech) — cloud database এর জন্য (GitHub দিয়ে login করতে পারেন)

---

## ধাপ ১: Turso Database তৈরি

### 1.1 Turso-তে signup/login করুন
- https://app.turso.tech এ যান
- GitHub দিয়ে login করুন

### 1.2 নতুন database তৈরি করুন
```bash
# Turso CLI install করুন (ঐচ্ছিক)
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Database তৈরি করুন
turso db create dfcl-it-db

# Database URL পান
turso db show dfcl-it-db --url

# Auth Token তৈরি করুন
turso db tokens create dfcl-it-db
```

অথবা Turso web dashboard থেকেও করতে পারেন — "New Database" → "dfcl-it-db" → Create।

### 1.3 এই দুটো মান সংরক্ষণ করুন
```
TURSO_DATABASE_URL = libsql://dfcl-it-db-your-username.turso.io
TURSO_AUTH_TOKEN   = eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### 1.4 Database-এ schema push করুন (local থেকে)
```bash
# Project directory-তে যান
cd /home/z/my-project

# .env ফাইলে temporarily Turso credentials সেট করুন
export TURSO_DATABASE_URL="libsql://dfcl-it-db-your-username.turso.io"
export TURSO_AUTH_TOKEN="your-token-here"
export DATABASE_URL="libsql://dfcl-it-db-your-username.turso.io"

# Schema push করুন
bun run db:push

# Demo data seed করুন (ঐচ্ছিক)
bun run seed
```

---

## ধাপ ২: GitHub-এ Push

### 2.1 Repository তৈরি করুন
GitHub-এ যান → "New repository" → নাম দিন `dfcl-it-inventory` → Private → Create।

### 2.2 GitHub PAT (Personal Access Token) তৈরি করুন
- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- "Generate new token" → Note: `dfcl-deploy`
- Scopes: `repo` (সম্পূর্ণ)
- Token copy করুন (শুধু একবার দেখাবে)

### 2.3 Push করুন
```bash
cd /home/z/my-project

# Git init (যদি না থাকে)
git init
git add .
git commit -m "Initial commit: DFCL-IT (Test System)"

# Remote add করুন (আপনার username দিন)
git remote add origin https://github.com/YOUR_USERNAME/dfcl-it-inventory.git

# Push করুন (PAT password হিসেবে ব্যবহার করুন)
git branch -M main
git push -u origin main
```

---

## ধাপ ৩: Vercel-এ Deploy

### 3.1 Vercel-এ project import করুন
- https://vercel.com/new এ যান
- "Import Git Repository" → আপনার GitHub account সিলেক্ট করুন
- `dfcl-it-inventory` repo খুঁজে বের করুন → Import

### 3.2 Build & Output Settings
```
Framework Preset:    Next.js (auto-detected)
Build Command:       bun run build
Output Directory:    .next
Install Command:     bun install
```

### 3.3 Environment Variables সেট করুন
"Environment Variables" section-এ এই 3টি যোগ করুন:

| Name | Value |
|------|-------|
| `TURSO_DATABASE_URL` | `libsql://dfcl-it-db-your-username.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` |
| `DATABASE_URL` | `libsql://dfcl-it-db-your-username.turso.io` |

### 3.4 Deploy করুন
"Deploy" বাটনে ক্লিক করুন। Build হতে 2-3 মিনিট লাগবে।

### 3.5 Deployment URL
Deploy সফল হলে Vercel আপনাকে একটি URL দেবে যেমন:
```
https://dfcl-it-inventory.vercel.app
```

---

## ধাপ ৪: Verify করুন

1. URL খুলুন
2. Login করুন: `admin` / `admin123`
3. যদি login কাজ করে — সব ঠিক আছে ✅
4. যদি login না কাজ করে — সম্ভবত seed করা হয়নি (ধাপ 1.4 দেখুন)

---

## 🔧 Troubleshooting

### Build failed: "prisma generate"
- Vercel project settings → Build & Development Settings → Build Command: `npx prisma generate && next build`

### Login কাজ করছে না (production)
- মানে database empty। Local থেকে schema push করুন (ধাপ 1.4)
- অথবা Vercel-এ build step-এ `bun run db:push && bun run seed` যোগ করুন

### "Database connection error"
- Environment variables ঠিকভাবে সেট করা আছে কিনা যাচাই করুন
- TURSO_DATABASE_URL অবশ্যই `libsql:` দিয়ে শুরু হতে হবে

### "Schema out of sync"
Local থেকে আবার push করুন:
```bash
DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." bun run db:push
```

---

## 📞 Support

- **Developer**: Abdur Rahman Akash
- **WhatsApp**: 01534955065

---

## 📝 Notes

- এই system-এ admin user তৈরি করা আছে: `admin` / `admin123`
- প্রথম deploy-এর পর database-এ schema push করা লাগবে (ধাপ 1.4)
- Local development-এ SQLite ব্যবহার হবে, production-এ Turso
- Database backup নিতে চাইলে: `turso db shell dfcl-it-db` দিয়ে SQL dump নিন
