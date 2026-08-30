export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DELETED';

export type UserProfile = Readonly<{
  id: string;
  email: string;
  displayName: string;
  locale: string;
  countryCode: string;
  status: UserStatus;
}>;

export type Session = Readonly<{
  user: UserProfile;
  authProvider: string;
  issuedAt: string;
  preview: boolean;
}>;
