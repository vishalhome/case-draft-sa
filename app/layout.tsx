import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, DISCLAIMER } from '@/lib/pricing';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'South African case document drafting SaaS'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <html lang="en">
      <body>
        <div className="nav">
          <Link href="/"><strong>{APP_NAME}</strong></Link>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="small">{DISCLAIMER}</span>
            {user ? <Link className="btn secondary" href="/dashboard">Dashboard</Link> : <>
              <Link className="btn secondary" href="/login">Log in</Link>
              <Link className="btn" href="/register">Register</Link>
            </>}
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
