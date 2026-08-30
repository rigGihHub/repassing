export type AuthMode = 'preview' | 'supabase';
export type DataMode = 'preview' | 'supabase';

const authMode = (process.env.AUTH_MODE ?? 'preview') as AuthMode;
const dataMode = (process.env.DATA_MODE ?? 'preview') as DataMode;

export const runtimeConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  authMode,
  dataMode,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
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
