import { describe, expect, it } from 'vitest';

import { LocalStore, type KeyValue } from '../src/local-store';
import { DEFAULT_FAVOURITES } from '../src/logic';
import type { Favourite, Item } from '../src/types';

function fakeKv(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
  };
}

async function latest(store: LocalStore) {
  let items: Item[] = [];
  let favs: Favourite[] = [];
  store.onItems((i) => (items = i));
  store.onFavourites((f) => (favs = f));
  store.open();
  await new Promise((r) => queueMicrotask(() => r(null)));
  return { items, favs };
}

const newItem = (name: string) => ({ name, qty: 1, note: '', category: 'other' as const, addedBy: 'Me', addedAt: Date.now(), purchased: false });

describe('LocalStore (Basket Solo)', () => {
  it('seeds the default quick-add buttons on first run and saves them', async () => {
    const kv = fakeKv();
    const store = await LocalStore.open(kv);
    await store.flush();
    const { favs } = await latest(store);
    expect(favs.map((f) => f.name)).toEqual(DEFAULT_FAVOURITES.map((f) => f.name));
    expect(kv.data.has('solo.favourites')).toBe(true);
  });

  it('keeps the list after the app is closed and reopened', async () => {
    const kv = fakeKv();
    const first = await LocalStore.open(kv);
    await first.addItem(newItem('Milk'));
    await first.addItem(newItem('Bread'));
    const { favs } = await latest(first);
    await first.deleteFavourite(favs[0].id);
    await first.flush();

    const reopened = await LocalStore.open(kv);
    const { items, favs: favs2 } = await latest(reopened);
    expect(items.map((i) => i.name)).toEqual(['Milk', 'Bread']);
    expect(favs2).toHaveLength(DEFAULT_FAVOURITES.length - 1);
  });

  it('does not re-seed buttons the user has deleted', async () => {
    const kv = fakeKv();
    const store = await LocalStore.open(kv);
    const { favs } = await latest(store);
    for (const f of favs) await store.deleteFavourite(f.id);
    await store.flush();
    const { favs: after } = await latest(await LocalStore.open(kv));
    expect(after).toEqual([]);
  });

  it('round-trips delete and undo with the same id', async () => {
    const kv = fakeKv();
    const store = await LocalStore.open(kv);
    await store.addItem(newItem('Eggs'));
    const { items } = await latest(store);
    await store.deleteItems(items.map((i) => i.id));
    await store.restoreItems(items);
    await store.flush();
    const { items: back } = await latest(await LocalStore.open(kv));
    expect(back).toEqual(items);
  });

  it('survives corrupted saved data', async () => {
    const kv = fakeKv();
    kv.data.set('solo.items', '{not json');
    kv.data.set('solo.favourites', JSON.stringify([{ nope: true }]));
    const { items, favs } = await latest(await LocalStore.open(kv));
    expect(items).toEqual([]);
    expect(favs).toEqual([]);
  });
});
