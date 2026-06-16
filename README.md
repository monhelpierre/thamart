This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment

Copy `.env.example` to `.env.local` and fill the following values before running locally:

```bash
cp .env.example .env.local
# edit .env.local and set:
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT='{ private_key: "<escaped>\n..." }'
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM="ThamArt Bijoux <noreply@thamart.com.br>"
# Optional site config overrides (API-driven):
# SITE_CONFIG_API_URL=/api/admin/config
# or edit siteConfigShared.DEFAULT_CONFIG directly
```

Notes:
- `FIREBASE_SERVICE_ACCOUNT` must be JSON-encoded on one line.
- `RESEND_API_KEY` is required to send emails via Resend.com.
- `EMAIL_FROM` defaults to ThamArt Bijoux if unset.

## Local Setup

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Seed the database (if needed) by visiting `/api/seed` while the server is running — the API will populate Firestore with initial products if empty.

If you want me to add deployment instructions for Vercel / Docker, say so and I will expand this section.

## Project Structure & Functionality

- `app/`
  - Contains Next.js App Router files: page.tsx, layout.tsx for the root layout and pages.
  - `app/api/`: Server API routes (seed products, list products, manage users and carts). Each route exports HTTP handlers.
- `components/`
  - Reusable React components: `Header`, `Footer`, `CartDrawer`, modals (checkout, product, review, order tracker, address prompt, Google sign-in), and Sections grouping UI like `Hero`, `Menu`, `HowItWorks`, `About`.
- `data/`
  - Static product definitions (`/data/products.ts`) used for seeding Firestore and rendering the menu.
- `lib/`
  - `firebase.ts` and `firebaseAdmin.ts`: Client and Admin Firebase initialization and helpers.
  - `email.ts`: Resend.com email sender functions.
  - `i18n.tsx`: Internationalization provider and hooks.
  - `siteConfig.tsx` + `siteConfigShared.ts`: Runtime site configuration provider and defaults.
- `public/`
  - Static assets: images, favicon, fonts.
- `next.config.js`, `tsconfig.json`, `postcss.config.mjs`, and `eslint.config.mjs`: Build, lint, and styling configurations.

Each module is designed to separate concerns: data, presentation, internationalization, API integration, and styling configurations. This structure helps maintain and extend the application consistently.
