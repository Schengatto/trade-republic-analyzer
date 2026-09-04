import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryOf } from '../../src/core/classify';

describe('categoryOf', () => {
  it('assigns every known operation type to exactly one category', () => {
    const seen = new Map<string, string>();
    for (const [category, types] of Object.entries(CATEGORIES)) {
      for (const type of types) {
        expect(seen.get(type), `${type} is in two categories`).toBeUndefined();
        seen.set(type, category);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('returns null for a type the export has never shown us', () => {
    expect(categoryOf('NEVER_SEEN_TYPE')).toBeNull();
  });

  it('classifies the types that carry their amount outside the amount field', () => {
    expect(categoryOf('TAX_OPTIMIZATION')).toBe('TAXES');
    expect(categoryOf('CARD_ORDERING_FEE')).toBe('ACCOUNT_COSTS');
  });
});
