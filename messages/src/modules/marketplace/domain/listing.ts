import type {Money} from '@/src/shared/domain/money';

export type ListingStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'RESERVED'
  | 'SOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REMOVED';

export type ListingCard = Readonly<{
  id: string;
  title: string;
  category: string;
  size: string;
  organization: string;
  price: Money;
  image: string;
  status: ListingStatus;
}>;
