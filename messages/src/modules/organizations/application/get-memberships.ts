import {previewMemberships} from '../infrastructure/preview-organizations';
import type {OrganizationMembershipView} from '../domain/organization';

export async function getMembershipsForUser(_userId: string): Promise<readonly OrganizationMembershipView[]> {
  // Database-backed repository adapter is deliberately deferred until the
  // managed Postgres environment is connected. The application contract is stable.
  return previewMemberships;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationMembershipView | null> {
  return previewMemberships.find((membership) => membership.organization.slug === slug) ?? null;
}
