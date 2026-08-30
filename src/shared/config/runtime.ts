export type AuthMode = 'preview' | 'supabase';
export type DataMode = 'preview' | 'supabase';
export type PaymentMode = 'disabled' | 'preview' | 'stripe';

const authMode = (process.env.AUTH_MODE ?? 'preview') as AuthMode;
const dataMode = (process.env.DATA_MODE ?? 'preview') as DataMode;
const paymentMode = (process.env.PAYMENT_MODE ?? 'disabled') as PaymentMode;

export const runtimeConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  authMode,
  dataMode,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  },
  payments: {
    mode: paymentMode,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    stripeAccountsV2Version: process.env.STRIPE_ACCOUNTS_V2_VERSION ?? '2026-07-29.preview'
  },
  supabaseConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
} as const;

export function assertProductionRuntime() {
  if ((runtimeConfig.authMode === 'supabase' || runtimeConfig.dataMode === 'supabase') && !runtimeConfig.supabaseConfigured) {
    throw new Error('Supabase runtime requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
}
