'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export function RegisterForm() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError('');
    setLoading(true);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    const fullName = String(formData.get('full_name') || '');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
  }

  if (done) {
    return <div className="notice">Check your inbox and click the activation link before logging in.</div>;
  }

  return (
    <form action={onSubmit} className="stack card">
      <div>
        <label className="label">Full name</label>
        <input className="input" name="full_name" required />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" name="password" type="password" minLength={8} required />
      </div>
      {error ? <div className="small" style={{ color: '#ff8e8e' }}>{error}</div> : null}
      <button className="btn" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
    </form>
  );
}

export function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError('');
    setLoading(true);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    window.location.href = '/dashboard';
  }

  return (
    <form action={onSubmit} className="stack card">
      <div>
        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />
      </div>
      <div>
        <label className="label">Password</label>
        <input className="input" name="password" type="password" required />
      </div>
      {error ? <div className="small" style={{ color: '#ff8e8e' }}>{error}</div> : null}
      <button className="btn" disabled={loading}>{loading ? 'Signing in...' : 'Log in'}</button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(formData: FormData) {
    setMessage('');
    setError('');
    const email = String(formData.get('email') || '');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) return setError(error.message);
    setMessage('Password reset email sent.');
  }

  return (
    <form action={onSubmit} className="stack card">
      <div>
        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />
      </div>
      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="small" style={{ color: '#ff8e8e' }}>{error}</div> : null}
      <button className="btn">Send reset email</button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(formData: FormData) {
    setError('');
    const password = String(formData.get('password') || '');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => { window.location.href = '/dashboard'; }, 1200);
  }

  return (
    <form action={onSubmit} className="stack card">
      <div>
        <label className="label">New password</label>
        <input className="input" name="password" type="password" minLength={8} required />
      </div>
      {done ? <div className="notice">Password updated. Redirecting...</div> : null}
      {error ? <div className="small" style={{ color: '#ff8e8e' }}>{error}</div> : null}
      <button className="btn">Update password</button>
    </form>
  );
}
