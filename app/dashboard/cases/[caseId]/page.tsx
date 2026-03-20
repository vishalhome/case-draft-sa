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
      <div className="grid two">
        <div className="card stack">
          <h1>{data.caseRow.title}</h1>
          <div className="small">Case number: {data.caseRow.case_number}</div>
          <div className="small">Court: {data.caseRow.court_name || 'Not set'}</div>
          <div className="small">Plaintiff: {data.caseRow.plaintiff_name || 'Not set'}</div>
          <div className="small">Defendant: {data.caseRow.defendant_name || 'Not set'}</div>
        </div>
        <div className="card stack">
          <div className="notice">This case is billed separately from all other cases.</div>
          <div><strong>Available credits:</strong> {data.availableCredits}</div>
          <TopUpButton caseId={caseId} />
        </div>
      </div>

      <Workstation caseId={caseId} startingMessages={data.messages} availableCredits={data.availableCredits} />
    </main>
  );
}
