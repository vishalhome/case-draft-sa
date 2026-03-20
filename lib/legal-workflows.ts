export interface ProcedureStage {
  code: string;
  title: string;
  authority: string;
  deadline?: string;
  summary: string;
}

export const HIGH_COURT_PROCEDURE: ProcedureStage[] = [
  {
    code: 's129',
    title: 'Section 129 notice received',
    authority: 'NCA section 129',
    summary: 'Starting point for credit-enforcement matters. Assess dispute, non-response, or debt-review posture before summons.',
  },
  {
    code: 'summons',
    title: 'Summons issued and served',
    authority: 'Uniform Rules 17 and 4',
    summary: 'Confirm summons competence, service, attachments, cause of action, jurisdiction, and formal compliance.',
  },
  {
    code: 'noi',
    title: 'Notice of intention to defend',
    authority: 'Uniform Rule 19',
    deadline: '10 court days',
    summary: 'Check whether defendant defended in time. Absence of a valid notice may justify default judgment steps.',
  },
  {
    code: 'exception',
    title: 'Exception pathway',
    authority: 'Uniform Rule 23',
    deadline: '20 / 10 / 15 court days',
    summary: 'Assess whether the particulars are vague and embarrassing or disclose no cause of action, and track notices to except.',
  },
  {
    code: 'declaration',
    title: 'Declaration by plaintiff',
    authority: 'Uniform Rule 20',
    deadline: '20 court days',
    summary: 'Where required, plaintiff delivers declaration after notice of intention to defend.',
  },
  {
    code: 'plea',
    title: 'Plea by defendant',
    authority: 'Uniform Rule 22',
    deadline: '20 court days',
    summary: 'Evaluate admissions, denials, non-admissions, special pleas, and whether allegations are adequately answered.',
  },
  {
    code: 'replication',
    title: 'Replication by plaintiff',
    authority: 'Uniform Rule 25',
    deadline: '15 court days',
    summary: 'Plaintiff may replicate to new matter raised in the plea before pleadings close.',
  },
  {
    code: 'discovery',
    title: 'Discovery',
    authority: 'Uniform Rule 35',
    deadline: '20 court days',
    summary: 'Prepare discovery notices, identify missing annexures, and isolate evidential gaps or privileged material.',
  },
  {
    code: 'pretrial',
    title: 'Pre-trial conference',
    authority: 'Uniform Rule 37',
    summary: 'Clarify issues, admissions, separated issues, witnesses, bundles, and settlement posture.',
  },
  {
    code: 'trial',
    title: 'Trial and judgment',
    authority: 'Uniform Rules 39 and 45',
    summary: 'Prepare trial plan, judgment consequences, and execution readiness.',
  },
  {
    code: 'appeal',
    title: 'Appeal',
    authority: 'Uniform Rule 49',
    deadline: '15 court days',
    summary: 'Assess appeal prospects, notice timelines, and effect on execution.',
  },
];

export const QUICK_ACTIONS = [
  {
    id: 'poc-summons-report',
    label: 'POC + Summons full analysis',
    helper: 'Creates a structured report analysing Particulars of Claim, summons compliance, causes of action, annexures, and exception/default-judgment risks.',
    prompt: `Prepare a complete South African High Court civil litigation analysis report based on the attached Summons and Particulars of Claim.

Required report structure:
1. Executive summary.
2. Document inventory and what appears missing.
3. Jurisdiction and cause-of-action assessment.
4. Rule 17 summons compliance review.
5. Rule 4 service/compliance considerations identifiable from the papers.
6. Detailed Particulars of Claim analysis: elements pleaded, chronology, quantum, contractual reliance, annexures, interest, locus standi, and relief.
7. Defects, contradictions, vagueness, embarrassment, and possible exception points under Rule 23.
8. Potential response options: defend, except, request further particulars, default-judgment risk, settlement leverage, debt-review/NCA issues if relevant.
9. Procedural roadmap using the High Court flow from section 129 / summons / Rule 19 / Rule 23 / Rule 20 / Rule 22 / Rule 25 / Rule 35 / Rule 37 / Rule 39 / Rule 49 / Rule 45.
10. Practical attorney action list with urgency markers.

Write as a professional legal report. Quote or paraphrase critical passages from the attached documents where necessary and tie every issue to the actual papers.`
  },
  {
    id: 'exception-review',
    label: 'Exception review',
    helper: 'Focuses on vague-and-embarrassing and no-cause-of-action grounds under Rule 23.',
    prompt: `Review the attached pleadings for a potential exception in the South African High Court. Identify every possible Rule 23 ground, distinguish vague-and-embarrassing complaints from no-cause-of-action complaints, indicate cure steps, and draft a ranked exception memo.`
  },
  {
    id: 'discovery-plan',
    label: 'Discovery and missing-documents plan',
    helper: 'Builds a Rule 35 strategy from the documents already supplied.',
    prompt: `Based on the attached papers, prepare a Rule 35-focused discovery and missing-documents plan. Identify missing annexures, evidential gaps, third-party documents, and propose the exact categories of documents that should be requested or discovered.`
  },
  {
    id: 'procedural-roadmap',
    label: 'Procedural roadmap',
    helper: 'Maps the matter through the SA High Court timeline from summons to appeal/execution.',
    prompt: `Produce a procedural roadmap for this matter using the South African High Court civil procedure flow reflected in the instructions: section 129 / debt review decision-tree if relevant, summons under Rule 17, service under Rule 4, notice of intention to defend under Rule 19, exception under Rule 23, declaration under Rule 20, plea under Rule 22, replication under Rule 25, discovery under Rule 35, pre-trial under Rule 37, trial under Rule 39, appeal under Rule 49, and execution under Rule 45. For each stage state the trigger, deadline, risk, and recommended action.`
  },
  {
    id: 'draft-response',
    label: 'Draft response / next document',
    helper: 'Generates the next pleading, notice, or attorney letter from the case papers.',
    prompt: `Using the attached papers, draft the next required litigation document for this matter. First identify the most appropriate next document and why. Then draft it in South African High Court style with headings, parties, case number, factual averments, prayer/relief, and signature blocks as appropriate.`
  }
] as const;
