import { CATEGORIES, categoryOrder, type CategoryId } from './categories';
import type { Favourite, Item } from './types';

export interface CategoryGroup {
  category: CategoryId;
  items: Item[];
}

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Items still to buy, grouped by aisle in shop order; oldest first within each aisle. */
export function groupByCategory(items: Item[]): CategoryGroup[] {
  const groups = new Map<CategoryId, Item[]>();
  for (const item of items) {
    if (item.purchased) continue;
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => categoryOrder(a) - categoryOrder(b))
    .map(([category, list]) => ({ category, items: list.sort((a, b) => a.addedAt - b.addedAt) }));
}

/** Items already bought, most recently ticked first. */
export function purchasedItems(items: Item[]): Item[] {
  return items.filter((i) => i.purchased).sort((a, b) => (b.purchasedAt ?? 0) - (a.purchasedAt ?? 0));
}

/** An item with this name that is still on the list (not yet bought), if any. */
export function findOpenItem(items: Item[], name: string): Item | undefined {
  return items.find((i) => !i.purchased && sameName(i.name, name));
}

export type QuickAddPlan = { kind: 'bump'; item: Item; qty: number } | { kind: 'add' };

/**
 * What tapping a quick-add button should do: if the item is already waiting on
 * the list, add to its quantity instead of creating a duplicate row.
 */
export function planQuickAdd(items: Item[], fav: Pick<Favourite, 'name' | 'defaultQty'>): QuickAddPlan {
  const existing = findOpenItem(items, fav.name);
  if (existing) return { kind: 'bump', item: existing, qty: existing.qty + Math.max(1, fav.defaultQty) };
  return { kind: 'add' };
}

/** "Dave" -> "D", "Sam Jones" -> "SJ". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface Suggestion {
  name: string;
  category: CategoryId;
}

/** Name suggestions for the add sheet, from quick-add buttons and anything bought before. */
export function suggestions(query: string, favourites: Favourite[], items: Item[], limit = 5): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  const pool: Suggestion[] = [
    ...favourites.map((f) => ({ name: f.name, category: f.category })),
    ...[...items].sort((a, b) => b.addedAt - a.addedAt).map((i) => ({ name: i.name, category: i.category })),
  ];
  for (const s of pool) {
    const key = s.name.trim().toLowerCase();
    if (seen.has(key) || key === q) continue;
    if (key.startsWith(q)) starts.push(s);
    else if (key.includes(q)) contains.push(s);
    else continue;
    seen.add(key);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** The category this household last used for a name, so repeat items land in the same aisle. */
export function rememberedCategory(name: string, favourites: Favourite[], items: Item[]): CategoryId | undefined {
  const fav = favourites.find((f) => sameName(f.name, name));
  if (fav) return fav.category;
  const past = [...items].sort((a, b) => b.addedAt - a.addedAt).find((i) => sameName(i.name, name));
  return past?.category;
}

export const DEFAULT_FAVOURITES: { name: string; category: CategoryId; defaultQty: number }[] = [
  { name: 'Bread', category: 'bakery', defaultQty: 1 },
  { name: 'Milk', category: 'dairy', defaultQty: 1 },
  { name: 'Eggs', category: 'dairy', defaultQty: 1 },
  { name: 'Sandwich', category: 'other', defaultQty: 1 },
  { name: 'Bananas', category: 'produce', defaultQty: 1 },
  { name: 'Butter', category: 'dairy', defaultQty: 1 },
  { name: 'Toilet roll', category: 'household', defaultQty: 1 },
  { name: 'Coffee', category: 'drinks', defaultQty: 1 },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
