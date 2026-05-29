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

## Stack

- Next.js 14 (App Router)
- React 18
- Mongoose 8
- Tailwind CSS 3
- date-fns
