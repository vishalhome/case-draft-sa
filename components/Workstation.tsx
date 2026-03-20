'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attached_document_names?: string[] | null;
}

async function fileToBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return dataUrl.split(',')[1];
}

export function Workstation({ caseId, startingMessages, availableCredits }: { caseId: string; startingMessages: Message[]; availableCredits: number; }) {
  const [messages, setMessages] = useState<Message[]>(startingMessages);
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [credits, setCredits] = useState(availableCredits);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError('');
    const documents = await Promise.all(files.map(async (file) => ({
      label: file.name,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      base64: await fileToBase64(file)
    })));
    const userMessage: Message = { role: 'user', content: prompt, attached_document_names: files.map((f) => f.name) };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt('');
    setFiles([]);

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, prompt: userMessage.content, documents })
    });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(json.error || 'Request failed');
      return;
    }
    setCredits(json.remainingCredits);
    setMessages([...nextMessages, { role: 'assistant', content: json.content }]);
  }

  return (
    <div className="grid two" style={{ alignItems: 'start' }}>
      <div className="card stack">
        <div className="notice">Credits remaining for this case: {credits}</div>
        <div>
          <label className="label">Attach PDFs for this message</label>
          <input className="input" type="file" accept="application/pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          {files.length ? <div className="small" style={{ marginTop: 8 }}>{files.map((f) => f.name).join(', ')}</div> : null}
        </div>
        <div>
          <label className="label">Instruction</label>
          <textarea className="textarea" rows={10} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Draft a Rule 35(12) notice..." />
        </div>
        {error ? <div className="small" style={{ color: '#ff8e8e' }}>{error}</div> : null}
        <button className="btn" onClick={send} disabled={busy || !prompt.trim()}>{busy ? 'Generating...' : 'Generate'}</button>
      </div>
      <div className="card">
        {messages.length === 0 ? <div className="small">No messages yet.</div> : messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.attached_document_names?.length ? <div className="small">Attachments: {message.attached_document_names.join(', ')}</div> : null}
            <pre className="wrap">{message.content}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
