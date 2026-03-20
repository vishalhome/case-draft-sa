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
  const { passphrase } = payfastConfig();

  const orderedKeys = [
    "merchant_id",
    "merchant_key",
    "return_url",
    "cancel_url",
    "notify_url",
    "name_first",
    "name_last",
    "email_address",
    "m_payment_id",
    "amount",
    "item_name",
    "item_description",
    "custom_int1",
    "custom_int2",
    "custom_int3",
    "custom_int4",
    "custom_int5",
    "custom_str1",
    "custom_str2",
    "custom_str3",
    "custom_str4",
    "custom_str5",
    "email_confirmation",
    "confirmation_address",
    "payment_method"
  ];

  const pieces: string[] = [];

  for (const key of orderedKeys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") {
      pieces.push(`${key}=${encodeValue(value)}`);
    }
  }

  if (passphrase && passphrase.trim() !== "") {
    pieces.push(`passphrase=${encodeValue(passphrase)}`);
  }

  const body = pieces.join("&");
  const calculated = crypto.createHash("md5").update(body).digest("hex");

  return calculated === data.signature;
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
