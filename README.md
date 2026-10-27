# SpendWise

A personal finance and spending-intelligence platform built with the MERN stack and TypeScript.
I am building it to learn full-stack engineering — every phase is written by hand, one step at a time.

SpendWise helps a person answer three questions: **where did my money go?**, **am I staying inside
my budget?**, and **am I getting closer to my goals?**

---

## Status

**Phase 1 of 18 complete. Phase 2 (Authentication) in progress.**

This is an active learning project. Features listed under "Built" are working; everything else is
planned.



---

## What is built so far

### Backend
- Express 5 + TypeScript project (`backend/`)
- `helmet()`, JSON body parsing, CORS, 404 handler, central error handler
- Env loader with validation and a CLI:
  `npx tsx src/config/env.ts validate | show | generate-secrets`
- MongoDB connection with graceful shutdown
- User model (Mongoose) with hashed password field and refresh-token field
- Repository layer, auth service, password hashing (bcrypt), JWT sign/verify helpers
- Zod validators for register / login
- `AppError` for typed HTTP errors

### Frontend
- React 19 + Vite + TypeScript (`frontend/`)
- Tailwind CSS v4 + shadcn/ui design system, dark mode, Geist font
- Routing: `/`, `/login`, `/dashboard`, `*`
- Login page with `react-hook-form` + `zod` validation and show/hide password
- UI toolkit installed: Redux Toolkit, React Router, Axios, Recharts, TanStack Table, date-fns, Lucide, Motion

### Not connected yet
- Auth routes, controllers and middleware do not exist yet, so no endpoint is protected
- The login page is UI only — it is not talking to the backend
- There is no database schema for transactions, budgets, goals or categories yet

---

## Planned features

| Area | Features |
|------|----------|
| Auth | Register, login, refresh, logout, protected routes, email verification |
| Money | Transactions (CRUD, filters, search, pagination), categories, CSV import |
| Planning | Monthly budgets with alerts, financial goals with progress |
| Insight | Dashboard summary, charts, spending analytics, monthly reports |
| Automation | Recurring transactions, email / in-app notifications |
| Platform | Redis caching, RabbitMQ queues, real-time updates, tests, Docker, CI/CD, AWS deploy |

---

## Tech stack

**Frontend:** React 19, TypeScript, Vite, Tailwind v4, shadcn/ui, Redux Toolkit, RTK Query,
React Hook Form, Zod, Recharts, TanStack Table, Axios, date-fns

**Backend:** Node.js, Express 5, TypeScript, MongoDB + Mongoose, JWT, bcrypt, Zod,
Helmet, CORS, express-rate-limit, Pino

**Later:** Redis, RabbitMQ, Socket.IO, Jest + Supertest, Docker, GitHub Actions, AWS

**Architecture:** Controller → Service → Repository → Model.
**Frontend shape:** Pages → Features (components / hooks / services / types) → Common → Store.

---

## Project structure

```text
SpendWise/
├── backend/
│   ├── src/
│   │   ├── config/          env + database
│   │   ├── middleware/      error, not-found
│   │   ├── models/          Mongoose schemas
│   │   ├── repositories/    database access
│   │   ├── services/        business logic
│   │   ├── utils/           jwt, password, AppError
│   │   ├── validators/      Zod schemas
│   │   ├── app.ts           Express app
│   │   └── server.ts        entry point
│   ├── .env                 local only, never committed
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/           Home, Login, Dashboard
│   │   ├── assets/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Run it locally

**Requirements:** Node.js 20+, npm, MongoDB running locally.

```bash
# 1. Backend
cd backend
npm install
# create .env with:
#   PORT=5000
#   NODE_ENV=development
#   MONGODB_URI=mongodb://localhost:27017/spendwise
#   JWT_ACCESS_SECRET=<32+ random chars>
#   JWT_REFRESH_SECRET=<32+ random chars>
#   JWT_ACCESS_EXPIRY=15m
#   JWT_REFRESH_EXPIRY=7d
#   CLIENT_URL=http://localhost:5173
npx tsx src/config/env.ts generate-secrets
npm run dev

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Health check | http://localhost:5000/health |

---

## Security notes

- Secrets live only in `backend/.env`, which is git-ignored.
- Passwords are hashed with bcrypt; plain passwords are never stored or logged.
- Access tokens are short-lived; refresh tokens are rotated on refresh.
- All request input is validated with Zod on the server.
- Errors are returned as safe messages — no stack traces.
- HTTPS, `httpOnly` cookies and rate limiting are applied before any public deployment.
- Only `backend/`, `frontend/`, `README.md` and `.gitignore` are published to this repository.

If you find a security problem, please open an issue instead of posting exploit details publicly.

---

## What's new

### 2026-10-27
- Added a `README.md` that explains what the project is, what is built, and what is next.
- Added a strict `.gitignore` so only source code and this README are published.
- Added a local rules file that keeps the work consistent and the repo clean.

### 2026-10-21
- Auth service, user repository, JWT helpers and password utilities.
- User model and register/login validators.
- Phase 1 architecture finished: env config, database config, error middleware, 404 middleware.

### 2026-10-08
- Frontend scaffolded: Vite + React 19 + TypeScript.
- Tailwind CSS v4, shadcn/ui, dark mode and the full day-one package set.
- Login page with client-side validation.

---

## Roadmap

```text
1  Project setup + architecture      DONE
2  Authentication                    IN PROGRESS
3  Users and profiles
4  Transactions
5  Categories
6  Budgets
7  Dashboard and analytics
8  Financial goals
9  Recurring transactions
10 CSV import
11 Notifications
12 Redis caching
13 RabbitMQ queues
14 Real-time features
15 Testing
16 Docker
17 CI/CD
18 AWS deployment
```

---

## License

Personal learning project. Not licensed for redistribution.
