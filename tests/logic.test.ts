import { describe, expect, it } from 'vitest';

import { guessCategory } from '../src/categories';
import { generateCode, isValidCode, normaliseCode } from '../src/household';
import { findOpenItem, groupByCategory, initials, planQuickAdd, purchasedItems, rememberedCategory, suggestions } from '../src/logic';
import type { Favourite, Item } from '../src/types';

let n = 0;
const item = (over: Partial<Item>): Item => ({
  id: `i${n++}`, name: 'Thing', qty: 1, note: '', category: 'other', addedBy: 'Dave', addedAt: n, purchased: false, ...over,
});
const fav = (over: Partial<Favourite>): Favourite => ({ id: `f${n++}`, name: 'Milk', category: 'dairy', defaultQty: 1, order: 0, ...over });

describe('groupByCategory', () => {
  it('groups open items by aisle in shop order, oldest first, leaving out bought items', () => {
    const items = [
      item({ name: 'Bleach', category: 'household', addedAt: 1 }),
      item({ name: 'Milk', category: 'dairy', addedAt: 5 }),
      item({ name: 'Apples', category: 'produce', addedAt: 3 }),
      item({ name: 'Cheese', category: 'dairy', addedAt: 2 }),
      item({ name: 'Bread', category: 'bakery', purchased: true }),
    ];
    const groups = groupByCategory(items);
    expect(groups.map((g) => g.category)).toEqual(['produce', 'dairy', 'household']);
    expect(groups[1].items.map((i) => i.name)).toEqual(['Cheese', 'Milk']);
  });
});

describe('purchasedItems', () => {
  it('lists bought items, most recent first', () => {
    const items = [item({ name: 'A', purchased: true, purchasedAt: 1 }), item({ name: 'B', purchased: true, purchasedAt: 9 }), item({ name: 'C' })];
    expect(purchasedItems(items).map((i) => i.name)).toEqual(['B', 'A']);
  });
});

describe('quick add', () => {
  it('bumps the quantity when the item is already on the list (ignoring case and spaces)', () => {
    const milk = item({ name: ' milk ', qty: 2 });
    expect(findOpenItem([milk], 'Milk')).toBe(milk);
    expect(planQuickAdd([milk], fav({ name: 'Milk', defaultQty: 1 }))).toEqual({ kind: 'bump', item: milk, qty: 3 });
  });
  it('adds a new row when the only match has already been bought', () => {
    expect(planQuickAdd([item({ name: 'Milk', purchased: true })], fav({ name: 'Milk' }))).toEqual({ kind: 'add' });
  });
});

describe('suggestions', () => {
  it('prefers prefix matches and removes duplicates', () => {
    const favs = [fav({ name: 'Milk' }), fav({ name: 'Oat milk' })];
    const items = [item({ name: 'milk' }), item({ name: 'Mince' })];
    expect(suggestions('mi', favs, items).map((s) => s.name)).toEqual(['Milk', 'Mince', 'Oat milk']);
    expect(suggestions('', favs, items)).toEqual([]);
  });
  it('remembers the aisle used before', () => {
    expect(rememberedCategory('halloumi', [], [item({ name: 'Halloumi', category: 'meat' })])).toBe('meat');
    expect(rememberedCategory('nope', [], [])).toBeUndefined();
  });
});

describe('guessCategory', () => {
  it.each([
    ['Bananas', 'produce'], ['Sourdough bread', 'bakery'], ['Semi-skimmed milk', 'dairy'], ['Toilet roll', 'household'],
    ['Ice cream', 'frozen'], ['Coffee beans', 'drinks'], ['Shampoo', 'toiletries'], ['Mystery', 'other'],
  ])('%s -> %s', (name, cat) => expect(guessCategory(name)).toBe(cat));
});

describe('initials', () => {
  it('handles one or more names', () => {
    expect(initials('dave')).toBe('D');
    expect(initials('Sam  Jones')).toBe('SJ');
    expect(initials('  ')).toBe('?');
  });
});

describe('household codes', () => {
  it('generates valid codes', () => {
    for (let i = 0; i < 50; i++) expect(isValidCode(generateCode())).toBe(true);
    expect(generateCode(() => 7)).toBe('bloom-bloom-bloom-0007');
  });
  it('forgives sloppy typing', () => {
    expect(normaliseCode('  Maple Otter  Cloud 4821 ')).toBe('maple-otter-cloud-4821');
    expect(isValidCode(normaliseCode('maple--otter-cloud-4821'))).toBe(true);
    expect(isValidCode('maple-otter-4821')).toBe(false);
  });
});
