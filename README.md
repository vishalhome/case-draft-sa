# CaseDraft SA MVP

A case-based legal drafting SaaS for South African matters.

## What this build does

- Email/password registration with email confirmation through Supabase Auth
- One user can own multiple cases
- Each case is billed separately
- Starter purchase: R1000 for 50 credits
- Top-up purchase: R200 for 20 credits
- Claude calls happen only on the server
- Credits are consumed per case based on Anthropic token usage
- PayFast ITN unlocks credits for the exact case paid for

## Stack

- Next.js App Router
- Supabase Auth + Postgres
- PayFast
- Anthropic Claude
- Vercel

## Local run

1. Copy `.env.example` to `.env.local`
2. Fill in all variables
3. `npm install`
4. Run the SQL in `supabase/migrations/0001_init.sql`
5. `npm run dev`

## Important architecture notes

- `SYSTEM_PROMPT` must live only in the server environment. Do not put it in client code.
- `SUPABASE_SERVICE_ROLE_KEY` is required because the PayFast webhook is server-to-server and has no logged-in user session.
- Credit allocation and credit consumption are handled with Postgres functions for consistency.

## Files to know first

- `app/api/claude/route.ts` - protected Claude proxy
- `app/api/payfast/initiate/route.ts` - creates pending payment and PayFast form
- `app/api/payfast/notify/route.ts` - PayFast ITN webhook
- `supabase/migrations/0001_init.sql` - database schema and credit functions
- `.env.example` - environment variables

## Production deployment summary

1. Create a Supabase project
2. Run the SQL migration
3. Configure Supabase Auth site URL and redirect URL
4. Create a PayFast sandbox account and configure the ITN URL
5. Put all environment variables into Vercel
6. Connect the GitHub repository to Vercel and deploy
7. Test sign-up, email confirmation, purchase, ITN, and Claude generation


## Front-end litigation workstation additions

The case workspace now includes:
- document upload and per-document tagging for summons, POC, section 129 notice, plea, discovery bundle, contract, and other papers
- quick-action litigation workflows for exception review, discovery planning, procedural roadmap, and next-document drafting
- a dedicated **Run full POC + Summons analysis** button that requires a tagged summons and Particulars of Claim, then asks the AI for a structured legal report
- a visible SA High Court procedure roadmap drawn from the supplied section 129 / Rule 17 / Rule 4 / Rule 19 / Rule 23 / Rule 20 / Rule 22 / Rule 25 / Rule 35 / Rule 37 / Rule 39 / Rule 49 / Rule 45 flow

Current limitation: uploaded PDFs are still sent directly to Claude per request and are not yet stored permanently in Supabase Storage. That can be added in the next iteration.
