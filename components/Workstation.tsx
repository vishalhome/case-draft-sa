'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { HIGH_COURT_PROCEDURE, QUICK_ACTIONS } from '@/lib/legal-workflows';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  attached_document_names?: string[] | null;
};

type UploadedDocument = {
  file: File;
  docType: string;
};

const DOCUMENT_TYPES = [
  'Particulars of Claim',
  'Combined Summons',
  'Simple Summons',
  'Section 129 Notice',
  'Declaration',
  'Plea',
  'Exception',
  'Discovery Bundle',
  'Correspondence',
  'Contract / Agreement',
  'Statement of Account',
  'Other',
];

const MAX_DOCUMENT_COUNT = 5;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function Workstation({
  caseId,
  startingMessages,
  availableCredits,
}: {
  caseId: string;
  startingMessages: Message[];
  availableCredits: number;
}) {
  const [messages, setMessages] = useState<Message[]>(startingMessages);
  const [prompt, setPrompt] = useState('');
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [credits, setCredits] = useState(availableCredits);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeQuickAction, setActiveQuickAction] = useState<string>('');

  const groupedDocs = useMemo(() => {
    return documents.map((doc, index) => ({
      index,
      name: doc.file.name,
      docType: doc.docType,
      sizeMb: (doc.file.size / (1024 * 1024)).toFixed(2),
    }));
  }, [documents]);

  function inferDocumentType(name: string) {
    const lower = name.toLowerCase();

    if (lower.includes('poc') || lower.includes('particular')) {
      return 'Particulars of Claim';
    }
    if (lower.includes('summons')) {
      return 'Combined Summons';
    }
    if (lower.includes('129')) {
      return 'Section 129 Notice';
    }
    if (lower.includes('plea')) {
      return 'Plea';
    }
    if (lower.includes('discovery')) {
      return 'Discovery Bundle';
    }
    if (lower.includes('contract') || lower.includes('agreement')) {
      return 'Contract / Agreement';
    }
    if (lower.includes('statement') || lower.includes('account')) {
      return 'Statement of Account';
    }

    return 'Other';
  }

  function setFiles(fileList: FileList | null) {
    setError('');

    const files = Array.from(fileList || []);

    if (files.length > MAX_DOCUMENT_COUNT) {
      setDocuments([]);
      setError(`Please upload no more than ${MAX_DOCUMENT_COUNT} documents at a time.`);
      return;
    }

    const next = files.map((file) => ({
      file,
      docType: inferDocumentType(file.name),
    }));

    setDocuments(next);
  }

  function updateDocType(index: number, docType: string) {
    setDocuments((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, docType } : item
      )
    );
  }

  function applyQuickAction(actionId: string) {
    const action = QUICK_ACTIONS.find((item) => item.id === actionId);
    if (!action) return;

    setActiveQuickAction(actionId);
    setPrompt(action.prompt);
    setError('');
  }

  async function uploadToSupabase(file: File, currentCaseId: string) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `cases/${currentCaseId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('case-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf',
      });

    if (uploadError) {
      throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
    }

    return filePath;
  }

  async function send(explicitPrompt?: string) {
    const finalPrompt = String(explicitPrompt ?? prompt).trim();
    if (!finalPrompt || busy) return;

    setBusy(true);
    setError('');

    try {
      const apiDocuments = await Promise.all(
        documents.map(async (document) => {
          const storagePath = await uploadToSupabase(document.file, caseId);

          return {
            label: `${document.docType}: ${document.file.name}`,
            fileName: document.file.name,
            docType: document.docType,
            mimeType: document.file.type || 'application/pdf',
            storagePath,
          };
        })
      );

      const inventory = documents.length
        ? `\n\n[DOCUMENT INVENTORY]\n${documents
            .map(
              (document, index) =>
                `${index + 1}. ${document.docType}: ${document.file.name}`
            )
            .join('\n')}\n[/DOCUMENT INVENTORY]`
        : '';

      const userPrompt = `${finalPrompt}${inventory}`;

      const userMessage: Message = {
        role: 'user',
        content: userPrompt,
        attached_document_names: documents.map(
          (item) => `${item.docType}: ${item.file.name}`
        ),
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setPrompt('');
      setActiveQuickAction('');

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          prompt: userPrompt,
          documents: apiDocuments,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const text = await response.text();
        setBusy(false);
        setError(text || 'Request failed');
        return;
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        setBusy(false);
        setError(text || 'Server returned a non-JSON response');
        return;
      }

      const json = await response.json();

      setBusy(false);
      setCredits(Number(json.remainingCredits ?? credits));
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: String(json.content || '') },
      ]);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  async function runPocSummonsAnalysis() {
    const hasPoc = documents.some(
      (item) => item.docType === 'Particulars of Claim'
    );
    const hasSummons = documents.some(
      (item) =>
        item.docType === 'Combined Summons' ||
        item.docType === 'Simple Summons'
    );

    if (!hasPoc || !hasSummons) {
      setError(
        'Upload and tag at least one Particulars of Claim document and one Summons document before running the full analysis report.'
      );
      return;
    }

    const action = QUICK_ACTIONS.find(
      (item) => item.id === 'poc-summons-report'
    );
    if (!action) return;

    await send(action.prompt);
  }

  return (
    <div className="workspace-grid">
      <div className="stack">
        <div className="card stack">
          <div className="section-head">
            <div>
              <h2>AI drafting workstation</h2>
              <div className="small">
                Upload matter papers, choose a workflow, then generate drafting
                or analysis output for this specific case.
              </div>
            </div>
            <div className="notice">
              Credits remaining for this case: {credits}
            </div>
          </div>

          <div>
            <label className="label">Upload case papers (PDF only for now)</label>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
            <div className="small" style={{ marginTop: 8 }}>
              Files are now uploaded to secure case storage first. You can upload
              larger PDFs here without sending the full files directly in the AI request.
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              Best practice: upload summons, Particulars of Claim, contract,
              statement of account, section 129 notice, and any defence papers
              separately.
            </div>
          </div>

          {groupedDocs.length ? (
            <div className="stack">
              <div className="label">Uploaded documents</div>
              <div className="doc-list">
                {groupedDocs.map((document) => (
                  <div
                    key={`${document.name}-${document.index}`}
                    className="doc-item"
                  >
                    <div>
                      <div>
                        <strong>{document.name}</strong>
                      </div>
                      <div className="small">{document.sizeMb} MB</div>
                    </div>
                    <select
                      className="select"
                      value={document.docType}
                      onChange={(e) =>
                        updateDocType(document.index, e.target.value)
                      }
                    >
                      {DOCUMENT_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="stack">
            <div className="label">Quick actions</div>
            <div className="quick-actions">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`btn secondary quick-btn${
                    activeQuickAction === action.id ? ' active' : ''
                  }`}
                  onClick={() => applyQuickAction(action.id)}
                  disabled={busy}
                >
                  <span>{action.label}</span>
                  <span className="small">{action.helper}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="stack">
            <div className="label">Instruction / prompt</div>
            <textarea
              className="textarea"
              rows={14}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Draft a notice of intention to except, based on the attached summons and Particulars of Claim, focusing on vagueness, missing material allegations, and annexure defects."
            />
          </div>

          <div className="action-row">
            <button
              className="btn"
              onClick={() => send()}
              disabled={busy || !prompt.trim()}
            >
              {busy ? 'Generating...' : 'Generate from current prompt'}
            </button>

            <button
              className="btn secondary"
              onClick={runPocSummonsAnalysis}
              disabled={busy}
            >
              Run full POC + Summons analysis
            </button>
          </div>

          {error ? <div className="small error-text">{error}</div> : null}
        </div>

        <div className="card stack">
          <h3>Conversation and outputs</h3>
          {messages.length === 0 ? (
            <div className="small">No output yet.</div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-head">
                  <strong>
                    {message.role === 'assistant' ? 'AI output' : 'Instruction'}
                  </strong>
                  {message.attached_document_names?.length ? (
                    <span className="small">
                      {message.attached_document_names.join(' | ')}
                    </span>
                  ) : null}
                </div>
                <pre className="wrap">{message.content}</pre>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="stack">
        <div className="card stack">
          <h3>High Court procedure roadmap</h3>
          <div className="small">
            Built from the supplied High Court flow: section 129 / summons /
            defence / exception / pleadings / discovery / pre-trial / trial /
            appeal / execution.
          </div>
          <div className="timeline">
            {HIGH_COURT_PROCEDURE.map((stage) => (
              <div key={stage.code} className="timeline-item">
                <div className="timeline-title">{stage.title}</div>
                <div className="small">
                  {stage.authority}
                  {stage.deadline ? ` · ${stage.deadline}` : ''}
                </div>
                <div className="small">{stage.summary}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card stack">
          <h3>Recommended upload pack</h3>
          <ul className="plain-list small">
            <li>Combined or simple summons</li>
            <li>Particulars of Claim</li>
            <li>Section 129 notice and proof of dispatch, where relevant</li>
            <li>Contract / agreement and all annexures</li>
            <li>Statement of account / certificate of balance</li>
            <li>Sheriff returns of service</li>
            <li>Any notice of intention to defend, exception, plea, or correspondence</li>
          </ul>
        </div>
      </div>
    </div>
  );
}