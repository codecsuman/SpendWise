# SpendWise

SpendWise is a personal finance and spending tracker built with the MERN stack and TypeScript. I am building it as a full-stack learning project, one feature at a time.

## Transactions demo

![SpendWise demo showing an expense being created, edited, filtered, and reflected in a budget](frontend/public/media/transactions-demo.gif)

The demo uses sample data. Create an expense, edit its amount, and find it by category and date. The budget reflects the change without a browser reload.

## Project status

**57% on the roadmap tracker as of 2026-11-22.** The tracker marks 8 of 18 phases complete, 3 in progress, and 7 pending. It measures configured file milestones.

## Features

| Area | Available in the workspace |
|---|---|
| Authentication and profile | Registration, login, logout, cookie-based sessions, profile settings, password changes, and Cloudinary profile photo upload |
| Transactions and categories | Manual create, edit, and delete, currency selection, search, category and date filters, sorting, pagination, category management, and CSV preview and import |
| Planning | Monthly budgets, savings goals, contributions, and recurring transaction rules |
| Reporting | Dashboard and analytics with day and month filters, category breakdowns, historical trends, and budget spending through a selected date |
| Workspace | Notes, quick notes, linked records, and a calculator |
| Interface | Responsive filters and forms with shared dropdowns and date controls. Browser-saved Appearance settings include a continuous 1–100 theme, per-page accents, scale, spacing, corners, shadows, and motion. |

Successful transaction changes refresh the ledger, Dashboard, Analytics, and Budgets. The local recurring scheduler starts with the backend. Open **Settings** in the sidebar to customize the interface or restore defaults.

## Tech stack and structure

- **Frontend** uses React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit/RTK Query, React Hook Form, Zod, and Recharts.
- **Backend** uses Node.js, Express 5, TypeScript, MongoDB/Mongoose, JWT, bcrypt, Zod, Multer, and Cloudinary for profile photos.
- **Request flow** runs from route to controller, service, repository, and model.

| Path | Purpose |
|---|---|
| `backend/src/config/` | Environment and database configuration |
| `backend/src/routes/`, `controllers/`, `validators/` | HTTP endpoints, authentication, and input validation |
| `backend/src/services/`, `repositories/`, `models/` | Business logic and database access |
| `backend/src/queues/` | In-process recurring transaction scheduler |
| `frontend/src/pages/`, `features/` | Page views and feature-specific API clients |
| `frontend/src/components/`, `index.css` | Shared layout, controls, and themes |

## Run locally

Use Node.js 22.12 or later, npm, and a running MongoDB instance. Node.js 24 was used for local verification.

### Backend

From `SpendWise/backend`, run `npm install` and create `.env` with the following settings. Replace the two JWT placeholders with separate random values. Run the secret generator command twice and keep the output private.

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/spendwise
JWT_ACCESS_SECRET=replace-with-a-random-value
JWT_REFRESH_SECRET=replace-with-a-different-random-value
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run dev
```

For a compiled local run, use `npm run build` followed by `npm start`. The health check is `http://localhost:5000/health`.

### Frontend

In a separate terminal, run `npm install` and `npm run dev` from `SpendWise/frontend`. Open `http://localhost:5173`. To point the local frontend to another API, set `VITE_API_URL` in `frontend/.env.development` and restart Vite.

For **Continue with Google**, use a Google OAuth **Web application** client. Under **Authorized JavaScript origins**, add `http://localhost` and `http://localhost:5173`. The popup uses a JavaScript callback, so leave **Authorized redirect URIs** blank. Set the same public client ID as `GOOGLE_CLIENT_ID` in `backend/.env` and `VITE_GOOGLE_CLIENT_ID` in `frontend/.env.development`, then restart both apps.

The button signs up new users and signs returning users into the same account. If you already use a SpendWise password, sign in and link your Google account from **Profile → Google sign-in**.

### Email verification and password resets

Create a free Brevo account, verify a sender email, and generate a Brevo API key. Save these values in the ignored `backend/.env` and restart the backend. Brevo's free plan includes up to 300 email sends per day. [Brevo sender setup](https://developers.brevo.com/docs/getting-started-with-senders-and-domains) · [Free plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)

```dotenv
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=verified-sender@example.com
```

With delivery configured, new email signups require a six-digit email code. Existing users can verify from **Profile → Email verification**. **Forgot password?** sends a code to the account's email address. A successful reset signs out older sessions and sends a confirmation email. Codes expire after 10 minutes.

For production, set both Brevo variables on the backend host. Test runs load `backend/.env.test` and use mock email delivery in the email authentication integration test.

### Profile photo setup

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend environment to enable profile photo uploads. The backend signs requests and accepts JPEG, PNG, WebP, and HEIC/HEIF up to 5 MB. Keep Cloudinary credentials in the backend.

## Production configuration

- **Backend** takes settings from `backend/.env.production` or host-provided environment variables. Set the HTTPS frontend origin in `CLIENT_URL`, configure MongoDB and dedicated JWT secrets, then build and run `npm run start:production`.
- **Frontend** reads `frontend/.env.production` or build-time environment variables during `npm run build`. By default, serve the frontend over HTTPS and forward `/api/*` to Express on the same origin. Set `VITE_API_URL` at build time when using a separate same-site API origin.
- Keep actual environment files, database credentials, tokens, and API secrets out of Git. All `VITE_*` variables are public.

### Deploy the website and API together on Render

1. In MongoDB Atlas, create a database user with read/write access to `spendwise`. Open your cluster's **Connect → Drivers**, copy the Node.js connection string, and set the database name to `spendwise` before the query string. Keep this URI private. [Atlas connection guide](https://www.mongodb.com/docs/atlas/driver-connection/)
2. With these changes in your GitHub branch, open **New → Blueprint** in Render, select the SpendWise repository and branch, and enter `backend/render.yaml` as the **Blueprint Path**. Supply the Atlas URI when Render prompts for `MONGODB_URI`. The Blueprint builds both apps and generates the two JWT secrets. [Render Blueprint setup](https://render.com/docs/infrastructure-as-code)
3. Add the Render service's outbound IP ranges to the Atlas project’s IP access list so Express can connect. If the initial deploy timed out waiting for MongoDB, redeploy after updating the list. [Render outbound IPs](https://render.com/docs/outbound-ip-addresses)
4. Open the HTTPS URL on the Render service dashboard. It serves the website at `/`, the API at `/api`, and the health check at `/health`. The Blueprint uses that origin for `CLIENT_URL`. If you attach a custom domain, set `CLIENT_URL` to its full HTTPS origin.

The Blueprint uses Render's free web service. While the service is asleep, the in-process bill and reminder schedulers are paused. [Render free service behavior](https://render.com/docs/free)

## Verification and roadmap

From `SpendWise/backend`, run `npm test` with local MongoDB running. It builds the backend, runs the CSV parser tests, and tests signed-in CSV preview, first import, and reimport against a fresh database. The integration test removes its database after each run. To use a dedicated remote test cluster, set `TEST_MONGODB_URI` in the test environment with permission to create and remove the generated test database.

The backend health endpoint, frontend build and lint, and a signed-in Chrome test against local Express and MongoDB passed. The browser test covered transaction creation, editing, filters, deletion, and refreshed Dashboard and Budgets totals. Live Cloudinary upload and the browser CSV flow still need verification.

Next on the roadmap are notifications, Redis caching, RabbitMQ, real-time features, automated tests, Docker, CI/CD, and AWS deployment.

## License

Personal learning project. Redistribution rights are reserved.
