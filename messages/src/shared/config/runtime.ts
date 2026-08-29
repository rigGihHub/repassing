export const runtimeConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://repassing.se',
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  previewIdentity: true
} as const;
