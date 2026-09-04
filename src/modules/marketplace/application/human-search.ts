export type HumanMarketplaceQuery = {
  originalQuery?: string;
  searchQuery?: string;
  inferredSize?: string;
};

const numericSize = /^(?:2[0-9]|3[0-9]|4[0-9]|5[0-2]|8[0-9]|9[0-9]|1[0-9]{2})$/;
const letterSize = /^(?:xxs|xs|s|m|l|xl|xxl)$/i;

/**
 * Pulls an obvious apparel/shoe size out of a natural marketplace query.
 * The remaining words are deliberately left untouched: the database remains
 * responsible for relevance, brand, club, sport and category matching.
 * Explicit UI filters always win over inferred values.
 */
export function parseHumanMarketplaceQuery(query?: string): HumanMarketplaceQuery {
  const originalQuery = query?.trim().replace(/\s+/g, ' ');
  if (!originalQuery) return {};

  const tokens = originalQuery.split(' ');
  let sizeIndex = -1;

  // Prefer the last token. Natural searches overwhelmingly put size last
  // ("Nike skor 39", "ÖSK jacka 152") and this avoids treating years or
  // numbers inside a product name as a size too eagerly.
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const clean = tokens[index].replace(/^[,.;:()]+|[,.;:()]+$/g, '');
    if (numericSize.test(clean) || letterSize.test(clean)) {
      sizeIndex = index;
      break;
    }
  }

  if (sizeIndex < 0) return {originalQuery, searchQuery: originalQuery};

  const inferredSize = tokens[sizeIndex].replace(/^[,.;:()]+|[,.;:()]+$/g, '').toUpperCase();
  const searchQuery = tokens.filter((_, index) => index !== sizeIndex).join(' ').trim() || undefined;
  return {originalQuery, searchQuery, inferredSize};
}
