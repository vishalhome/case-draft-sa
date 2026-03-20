'use client';

import { useState } from 'react';

export function TopUpButton({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function topUp() {
    setLoading(true);
    setError('');
    const response = await fetch('/api/payfast/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, package_code: 'TOPUP_20' })
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) return setError(json.error || 'Payment could not start');
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = json.payfastUrl;
    Object.entries(json.formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  return <div className="stack"><button className="btn secondary" onClick={topUp} disabled={loading}>{loading ? 'Redirecting...' : 'Buy top-up: R200 / 20 credits'}</button>{error ? <span className="small" style={{ color: '#ff8e8e' }}>{error}</span> : null}</div>;
}
