export function organizationRoleLabel(role: string, sv: boolean) {
  switch (role.toUpperCase()) {
    case 'ORG_OWNER': return sv ? 'Föreningsägare' : 'Club owner';
    case 'CLUB_ADMIN': return sv ? 'Föreningsadmin' : 'Club admin';
    case 'TEAM_ADMIN': return sv ? 'Lagadmin' : 'Team admin';
    case 'MEMBER': return sv ? 'Medlem' : 'Member';
    default: return sv ? 'Medlem' : 'Member';
  }
}

export function organizationApplicationStatus(status: string, sv: boolean) {
  switch (status.toUpperCase()) {
    case 'SUBMITTED':
    case 'PENDING':
      return {label: sv ? 'Väntar på granskning' : 'Pending review', tone: 'pending'} as const;
    case 'APPROVED':
      return {label: sv ? 'Godkänd' : 'Approved', tone: 'approved'} as const;
    case 'REJECTED':
      return {label: sv ? 'Inte godkänd' : 'Not approved', tone: 'rejected'} as const;
    default:
      return {label: sv ? 'Under behandling' : 'In progress', tone: 'neutral'} as const;
  }
}
