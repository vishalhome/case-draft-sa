import crypto from 'crypto';
import { requireEnv } from '@/lib/utils';

export type PayfastPayload = Record<string, string>;

export function payfastConfig() {
  return {
    merchantId: requireEnv('PAYFAST_MERCHANT_ID'),
    merchantKey: requireEnv('PAYFAST_MERCHANT_KEY'),
    passphrase: requireEnv('PAYFAST_PASSPHRASE'),
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

export function signatureFromData(data: PayfastPayload, passphrase: string) {
  const pieces = Object.keys(data)
    .filter((key) => key !== 'signature' && data[key] !== '')
    .sort()
    .map((key) => `${key}=${encodeValue(data[key])}`);

  if (passphrase) pieces.push(`passphrase=${encodeValue(passphrase)}`);
  const body = pieces.join('&');
  return crypto.createHash('md5').update(body).digest('hex');
}

export function verifySignature(data: PayfastPayload) {
  const provided = data.signature || '';
  const calculated = signatureFromData(data, payfastConfig().passphrase);
  return provided === calculated;
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
  form.signature = signatureFromData(form, config.passphrase);
  return form;
}
