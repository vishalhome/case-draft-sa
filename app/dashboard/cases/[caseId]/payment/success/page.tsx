import Link from 'next/link';

export default async function Page({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <main className="container stack"><h1>Payment received</h1><div className="notice">PayFast redirected back successfully. Credits are added when the ITN webhook marks the payment as complete.</div><Link className="btn" href={`/dashboard/cases/${caseId}`}>Open case</Link></main>;
}
