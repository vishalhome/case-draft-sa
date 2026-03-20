import crypto from 'crypto';
import { requireEnv } from '@/lib/utils';

export type PayfastPayload = Record<string, string>;

export function payfastConfig() {
  return {
    merchantId: requireEnv('PAYFAST_MERCHANT_ID'),
    merchantKey: requireEnv('PAYFAST_MERCHANT_KEY'),
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    sandbox: process.env.PAYFAST_SANDBOX === 'true'
  };
}

export function payfastProcessUrl() {
  return payfastConfig().sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
}

function encodeValue(value: string) {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

/**
 * Used only for the hosted payment form redirect.
 * This uses the exact ordered field list you submit to PayFast.
 */
export function signatureForPaymentForm(data: PayfastPayload, passphrase?: string) {
  const orderedKeys = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'm_payment_id',
    'amount',
    'item_name',
    'item_description',
    'custom_int1',
    'custom_int2',
    'custom_int3',
    'custom_int4',
    'custom_int5',
    'custom_str1',
    'custom_str2',
    'custom_str3',
    'custom_str4',
    'custom_str5',
    'email_confirmation',
    'confirmation_address',
    'payment_method'
  ];

  const parts: string[] = [];

  for (const key of orderedKeys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${encodeValue(String(value).trim())}`);
    }
  }

  if (passphrase && passphrase.trim() !== '') {
    parts.push(`passphrase=${encodeValue(passphrase.trim())}`);
  }

  const signatureString = parts.join('&');
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

/**
 * Used only for ITN verification.
 * This uses the actual incoming payload fields from PayFast,
 * excluding "signature", preserving the incoming key order.
 */
export function verifyItnSignature(data: PayfastPayload) {
  const submittedSignature = data.signature || '';
  const { passphrase } = payfastConfig();

  const parts: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'signature') continue;
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${key}=${encodeValue(String(value).trim())}`);
  }

  if (passphrase && passphrase.trim() !== '') {
    parts.push(`passphrase=${encodeValue(passphrase.trim())}`);
  }

  const signatureString = parts.join('&');
  const calculatedSignature = crypto
    .createHash('md5')
    .update(signatureString)
    .digest('hex');

  return calculatedSignature === submittedSignature;
}

export function buildPaymentForm(params: {
  mPaymentId: string;
  itemName: string;
  itemDescription: string;
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  customStr1: string;
  customStr2: string;
  customStr3: string;
}) {
  const config = payfastConfig();

  const form: PayfastPayload = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    m_payment_id: params.mPaymentId,
    amount: params.amount.toFixed(2),
    item_name: params.itemName,
    item_description: params.itemDescription,
    email_address: params.email,
    name_first: params.firstName,
    name_last: params.lastName,
    custom_str1: params.customStr1,
    custom_str2: params.customStr2,
    custom_str3: params.customStr3
  };

  form.signature = signatureForPaymentForm(form, config.passphrase);
  return form;
}