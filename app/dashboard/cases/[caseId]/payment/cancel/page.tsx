import Link from 'next/link';

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <main className="container stack"><h1>Payment cancelled</h1><div className="notice">No credits were added.</div><Link className="btn secondary" href={`/dashboard/cases/${caseId}`}>Back to case</Link></main>;
}
