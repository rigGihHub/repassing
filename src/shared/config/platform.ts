export const platformConfig = {
  name: 'Repassing',
  tagline: 'Play more. Waste less.',
  defaultLocale: 'sv',
  supportedLocales: ['sv', 'en'] as const,
  defaultCountry: 'SE',
  defaultCurrency: 'SEK',
  architecture: 'modular-monolith' as const
};

export type SupportedLocale = (typeof platformConfig.supportedLocales)[number];
