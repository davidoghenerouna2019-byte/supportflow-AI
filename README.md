# Support Flow AI

**Product Owner:** Ijirigho David Oghenerouna  
**Platform:** AI-Powered Customer Support Management System

Support Flow AI combines a public SaaS website, a Gemini-grounded customer support chat interface, automated enquiry classification and department routing, and an authenticated Administrator & Support Agent dashboard backed by PostgreSQL.

---

## Key Features

- **Public SaaS Website:** Responsive landing page with product preview, 8-feature overview, 4-step workflow, FAQ, contact inquiry form, and live chat drawer.
- **Customer AI Chat Interface:** Powered by Google Gemini (`gemini-4-hydrogen`) using retrieval-augmented generation (RAG) strictly over **published** knowledge base articles, with clear citations, fallback escalation guidance, and `"Talk to a Human"` hand-off.
- **Automated Department Routing:** Configurable keyword and category priority rules (`routing_rules`) combined with AI department recommendations across 5 support departments.
- **Admin & Support Agent Dashboard:** Overview KPIs, 5 live analytics charts, Live Inbox, full Conversation Management (reply, internal notes, assign agent, transfer department, status updates, resolution outcomes), Customer Directory, Support Agents, Departments, Knowledge Base CMS, Routing Rules, Analytics CSV Export, and Audit Logs.
- **Security & Data Protection:** Password hashing (`bcryptjs`), dual JWT + Firebase Google Sign-In authentication, strict role-based access control (`ADMIN`, `AGENT`, `CUSTOMER`), cross-customer isolation, Helmet HTTP headers, rate limiting, Zod validation, and NDPA-aligned data minimization.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, React Router, Axios, Recharts, Lucide React
- **Backend:** Node.js, Express.js, Zod, Helmet, Express Rate Limit, JWT, Firebase Admin SDK
- **Database:** PostgreSQL (Cloud SQL) with Drizzle ORM (`src/db/schema.ts`)
- **AI:** `@google/genai` SDK (`gemini-4-hydrogen`)

---

## Development Demo Credentials

> For development and evaluation testing only. Do not deploy default demo passwords to production without rotating them.

- **Administrator:**
  - Email: `admin@supportflow.ai`
  - Password: `AdminFlow2026!`
- **Support Agents** (Password for all seeded demo agents: `AgentFlow2026!`):
  - Technical Support: `amara.okafor@supportflow.ai`
  - Billing and Accounts: `daniel.mensah@supportflow.ai`
  - Sales: `clara.vance@supportflow.ai`
  - Complaints and Customer Relations: `tunde.adeyemi@supportflow.ai`
  - General Support: `nadia.benali@supportflow.ai`
- **Sample Customer** (Password: `CustomerFlow2026!`):
  - Email: `chidi.nwosu@acme-retail.example`

---

## Environment Variables

Copy `.env.example` and configure runtime secrets in your environment (never commit `.env` files to GitHub):

- `GEMINI_API_KEY`: Server-side Google Gemini API key.
- `SQL_HOST`: PostgreSQL host / Cloud SQL Unix socket path.
- `SQL_DB_NAME`: Database name.
- `SQL_USER`: Application read/write SQL user.
- `SQL_PASSWORD`: Application SQL password.
- `SQL_ADMIN_USER`: Admin SQL user for schema migrations (`drizzle-kit`).
- `SQL_ADMIN_PASSWORD`: Admin SQL password.
- `JWT_SECRET`: Secret used to sign session JWTs (minimum 16 characters; auto-generated in memory if omitted in dev).
- `APP_URL`: Public application URL for CORS allowlisting.

---

## Local Setup & Scripts

```bash
# 1. Install dependencies
npm install

# 2. Push database schema (requires SQL_ADMIN_* env vars)
npx drizzle-kit push --config=src/db/drizzle.config.ts

# 3. Start full-stack server (Express API + Vite on port 3000)
npm run dev

# 4. Run TypeScript check & production build
npm run lint
npm run build

# 5. Run backend API tests
npm test
```

---

## Deployment

### Docker / Container Deployment

1. Build the frontend assets and image:
   ```bash
   docker compose up --build
   ```
2. Set `NODE_ENV=production`, `GEMINI_API_KEY`, `JWT_SECRET`, and PostgreSQL `SQL_*` credentials in your cloud runtime secrets manager.
3. Run `npx drizzle-kit push --config=src/db/drizzle.config.ts` against your production PostgreSQL instance before starting the container (`npm start`).

---

## Privacy & NDPA Considerations

- Passwords are stored exclusively as salted bcrypt hashes.
- Customers may initiate support chats without sharing financial or sensitive personal data; name and email are requested only on registration or voluntary human escalation.
- Only `ADMIN` and `AGENT` accounts can inspect customer directories, internal agent notes, or audit logs.
