export type OrganizationType = 'FEDERATION' | 'REGION' | 'CLUB' | 'SECTION';
export type OrganizationRole = 'MEMBER' | 'TEAM_ADMIN' | 'CLUB_ADMIN' | 'OWNER';
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
