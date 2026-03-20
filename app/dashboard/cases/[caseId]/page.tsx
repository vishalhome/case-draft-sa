import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getCaseForUser } from '@/lib/data';
import { TopUpButton } from '@/components/TopUpButton';
import { Workstation } from '@/components/Workstation';

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const user = await requireUser();
  const { caseId } = await params;
  const data = await getCaseForUser(caseId, user.id);

  return (
    <main className="container stack">
      <Link href="/dashboard" className="small">← Back to dashboard</Link>
      <div className="case-header-grid">
        <div className="card stack">
          <div className="pill">Matter workspace</div>
          <h1>{data.caseRow.title}</h1>
          <div className="meta-grid">
            <div>
              <div className="small">Case number</div>
              <strong>{data.caseRow.case_number}</strong>
            </div>
            <div>
              <div className="small">Court</div>
              <strong>{data.caseRow.court_name || 'Not set'}</strong>
            </div>
            <div>
              <div className="small">Plaintiff</div>
              <strong>{data.caseRow.plaintiff_name || 'Not set'}</strong>
            </div>
            <div>
              <div className="small">Defendant</div>
              <strong>{data.caseRow.defendant_name || 'Not set'}</strong>
            </div>
          </div>
        </div>
        <div className="card stack">
          <div className="notice">This matter has its own isolated credits, payment history, and AI outputs.</div>
          <div><strong>Available credits:</strong> {data.availableCredits}</div>
          <div className="small">Use the full analysis button after uploading and tagging the summons and Particulars of Claim. The AI will then produce a structured report tied to this case.</div>
          <TopUpButton caseId={caseId} />
        </div>
      </div>

      <Workstation caseId={caseId} startingMessages={data.messages} availableCredits={data.availableCredits} />
    </main>
  );
}
