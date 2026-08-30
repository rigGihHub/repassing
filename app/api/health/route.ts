import {runtimeConfig} from '@/src/shared/config/runtime';

export async function GET() {
  return Response.json({
    status: 'ok',
    app: 'repassing',
    version: '0.3.1',
    environment: runtimeConfig.environment,
    services: {
      authMode: runtimeConfig.authMode,
      dataMode: runtimeConfig.dataMode,
      supabaseConfigured: runtimeConfig.supabaseConfigured
    }
  });
}
