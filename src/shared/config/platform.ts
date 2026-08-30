export const platformConfig = {
  name: 'Repassing',
  tagline: 'Play more. Waste less.',
  version: '0.2.0',
  defaultLocale: 'sv',
  supportedLocales: ['sv', 'en'] as const,
  defaultCountry: 'SE',
  defaultCurrency: 'SEK',
  architecture: 'modular-monolith' as const,
  apiVersion: 'v1' as const,
  tenancy: 'organization' as const
};

export type SupportedLocale = (typeof platformConfig.supportedLocales)[number];
