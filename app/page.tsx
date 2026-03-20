import Link from 'next/link';
import { STARTER_CREDITS, STARTER_PRICE_ZAR, TOPUP_CREDITS, TOPUP_PRICE_ZAR } from '@/lib/pricing';
import { currency } from '@/lib/utils';

export default function HomePage() {
  return (
    <main className="hero">
      <div className="container stack">
        <div className="notice">Each case is paid for separately. Users can buy multiple cases and top up later.</div>
        <h1>Sell case-based AI drafting on your own domain.</h1>
        <p>
          This build uses Supabase for email/password sign-up and email confirmation, PayFast for payment,
          Vercel for hosting, and Claude via a server-only API route so your prompt and API key stay private.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn" href="/register">Create account</Link>
          <Link className="btn secondary" href="/login">Sign in</Link>
        </div>
        <div className="grid two">
          <div className="card">
            <h3>Starter pack</h3>
            <p className="small">{STARTER_CREDITS} credits for one case number.</p>
            <strong>{currency(STARTER_PRICE_ZAR)}</strong>
          </div>
          <div className="card">
            <h3>Top-up pack</h3>
            <p className="small">{TOPUP_CREDITS} extra credits for a case that already exists.</p>
            <strong>{currency(TOPUP_PRICE_ZAR)}</strong>
          </div>
        </div>
      </div>
    </main>
  );
}
