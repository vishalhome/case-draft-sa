'use client';

import { useState } from 'react';

export function NewCaseForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setMessage('');
    setError('');
    const response = await fetch('/api/payfast/initiate', {
      method: 'POST',
      body: JSON.stringify({
        case_number: String(formData.get('case_number') || ''),
        title: String(formData.get('title') || ''),
        court_name: String(formData.get('court_name') || ''),
        plaintiff_name: String(formData.get('plaintiff_name') || ''),
        defendant_name: String(formData.get('defendant_name') || ''),
        package_code: 'STARTER_50'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || 'Could not start payment');
      return;
    }
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

  return (
    <form action={submit} className="card stack">
      <h3>Add a new case and pay starter fee</h3>
      <div>
        <label className="label">Case number</label>
        <input className="input" name="case_number" required />
      </div>
      <div>
        <label className="label">Case title</label>
        <input className="input" name="title" placeholder="Optional friendly label" />
      </div>
      <div className="grid two">
        <div>
          <label className="label">Court name</label>
          <input className="input" name="court_name" />
        </div>
        <div>
          <label className="label">Plaintiff</label>
          <input className="input" name="plaintiff_name" />
        </div>
      </div>
      <div>
        <label className="label">Defendant</label>
        <input className="input" name="defendant_name" />
      </div>
      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="small" style={{ color: '#ff8e8e' }}>{error}</div> : null}
      <button className="btn">Pay R1000 for 50 credits</button>
    </form>
  );
}
