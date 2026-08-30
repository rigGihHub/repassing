export type OrganizationType = 'FEDERATION' | 'REGION' | 'CLUB' | 'SECTION' | 'TEAM_ORG' | 'PARTNER';
export type OrganizationRole = 'MEMBER' | 'MODERATOR' | 'CLUB_ADMIN' | 'ORG_OWNER';
export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'LEFT';

export type OrganizationSummary = Readonly<{
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  countryCode: string;
  defaultCurrency: string;
  locale: string;
}>;

export type OrganizationMembershipView = Readonly<{
  id: string;
  organization: OrganizationSummary;
  role: OrganizationRole;
  status: MembershipStatus;
  teamNames: readonly string[];
}>;
