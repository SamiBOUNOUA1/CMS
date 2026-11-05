# Catering Quotes App

A Next.js 14 application for managing catering quotes, with a Google Material-inspired UI and MongoDB via Mongoose.

## Project structure

```
src/
├── app/
│   ├── layout.js              # Root layout with top app bar
│   ├── globals.css            # Google fonts + base styles
│   ├── page.js                # Quotes list (home page)
│   ├── quotes/
│   │   ├── new/page.js        # 4-step quote creation form
│   │   └── [id]/page.js       # Quote detail view
│   └── api/
│       └── quotes/
│           ├── route.js        # GET /api/quotes, POST /api/quotes
│           └── [id]/route.js   # GET, PATCH, DELETE /api/quotes/:id
└── lib/
    ├── mongodb.js              # Mongoose connection (cached)
    └── models.js               # All Mongoose schemas & models
```

## Quick start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure MongoDB**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and set your MONGODB_URI
   ```

3. **Run in development**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Quotes list** — search by client/event type, filter by status chip, sort by date/value/client, inline status update
- **Stats dashboard** — total quotes, accepted count, pipeline value
- **4-step quote form** — Client & Event → Menu Items → Staff → Summary with live totals
- **Quote detail** — full breakdown with financial summary sidebar, status management
- **MongoDB** — all data persisted via Mongoose; prices frozen at quote time; totals auto-computed via pre-save hook

## Email reminders

Tenants turn on email in **Settings → Email**. From there they can email quotes and receipts and set up automatic reminders (deposit, final guest count, thank-you).

**Sending modes**
- **Own SMTP:** the tenant enters their own SMTP account (Gmail app password, Outlook, their domain). The password is encrypted with `MFA_ENCRYPTION_KEY`.
- **Platform service:** one shared SMTP service for all tenants. Set `PLATFORM_SMTP_HOST`, `PLATFORM_SMTP_PORT`, `PLATFORM_SMTP_USER`, `PLATFORM_SMTP_PASS` and `PLATFORM_SMTP_FROM` (we use **Resend**: host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, and a From address on a domain verified in Resend). Until these are set, the platform option shows as unavailable.

**Daily reminder job**
1. Create both secrets **before** the next deploy (the deploy fails if they are missing), and give the backend access:
   ```
   firebase apphosting:secrets:set CRON_SECRET          # any long random string
   firebase apphosting:secrets:set PLATFORM_SMTP_PASS   # your Resend API key
   firebase apphosting:secrets:grantaccess CRON_SECRET,PLATFORM_SMTP_PASS --backend catering-management
   ```
   Never put these values in `apphosting.yaml` or any committed file.
2. Create a Cloud Scheduler job that runs once a day (e.g. `0 8 * * *`, Europe/Paris):
   ```
   gcloud scheduler jobs create http email-reminders \
     --schedule="0 8 * * *" --time-zone="Europe/Paris" \
     --uri="https://<your-app-url>/api/cron/reminders" --http-method=POST \
     --headers="Authorization=Bearer <CRON_SECRET>"
   ```
3. Each reminder is sent at most once per order. If the job misses a day, it catches up for up to 2 days. Orders with no customer email, or in a cancelled/lost status, are skipped.

To test locally: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders`. Note that dev uses the production database, so only test with a test tenant.

## Stack

- Next.js 14 (App Router)
- React 18
- Mongoose 8
- Tailwind CSS 3
- date-fns
