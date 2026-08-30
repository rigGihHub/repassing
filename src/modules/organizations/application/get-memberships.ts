import {previewMemberships} from '../infrastructure/preview-organizations';
import {findMembershipsForCurrentUser, findOrganizationBySlug} from '../infrastructure/supabase-organizations';
import type {OrganizationMembershipView} from '../domain/organization';
import {runtimeConfig} from '@/src/shared/config/runtime';

export async function getMembershipsForUser(_userId: string): Promise<readonly OrganizationMembershipView[]> {
  if (runtimeConfig.dataMode === 'supabase') return findMembershipsForCurrentUser();
  return previewMemberships;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationMembershipView | null> {
  if (runtimeConfig.dataMode === 'supabase') return findOrganizationBySlug(slug);
  return previewMemberships.find((membership) => membership.organization.slug === slug) ?? null;
}
