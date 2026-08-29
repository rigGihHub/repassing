import type {OrganizationMembershipView} from '../domain/organization';

export const previewMemberships: readonly OrganizationMembershipView[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    organization: {
      id: '00000000-0000-4000-8000-000000000201',
      name: 'ÖSK Fotboll',
      slug: 'osk-fotboll',
      type: 'CLUB',
      countryCode: 'SE',
      defaultCurrency: 'SEK',
      locale: 'sv-SE'
    },
    role: 'CLUB_ADMIN',
    status: 'ACTIVE',
    teamNames: ['P2014 Svart']
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    organization: {
      id: '00000000-0000-4000-8000-000000000202',
      name: 'Örebro Innebandy',
      slug: 'orebro-innebandy',
      type: 'CLUB',
      countryCode: 'SE',
      defaultCurrency: 'SEK',
      locale: 'sv-SE'
    },
    role: 'MEMBER',
    status: 'ACTIVE',
    teamNames: []
  }
];
