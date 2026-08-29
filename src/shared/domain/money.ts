export type CurrencyCode = string;

export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amountMinor)) throw new Error('Money must use integer minor units');
  return {amountMinor, currency};
}
