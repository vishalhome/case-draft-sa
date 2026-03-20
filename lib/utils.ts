import crypto from 'crypto';

export function currency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export function safeCaseTitle(caseNumber: string): string {
  return `Case ${caseNumber}`;
}

export function payfastId(): string {
  return `PF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
