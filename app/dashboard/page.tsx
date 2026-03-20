import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getDashboardCases } from '@/lib/data';
import { NewCaseForm } from '@/components/NewCaseForm';
import { SignOutButton } from '@/components/SignOutButton';

export default async function DashboardPage() {
  const user = await requireUser();
  const cases = await getDashboardCases(user.id);

  return (
    <main className="container stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>Dashboard</h1>
          <div className="small">Signed in as {user.email}</div>
        </div>
        <SignOutButton />
      </div>

      <div className="grid two">
        <NewCaseForm />
        <div className="card stack">
          <h3>Your cases</h3>
          {cases.length === 0 ? <div className="small">No cases yet.</div> : (
            <table className="table">
              <thead>
                <tr><th>Case</th><th>Credits</th><th></th></tr>
              </thead>
              <tbody>
                {cases.map((row: any) => (
                  <tr key={row.id}>
                    <td>
                      <div><strong>{row.title}</strong></div>
                      <div className="small">{row.case_number}</div>
                    </td>
                    <td><span className="pill">{row.available_credits} credits</span></td>
                    <td><Link className="btn secondary" href={`/dashboard/cases/${row.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
