import { isCategory } from './categories';
import { DEFAULT_FAVOURITES } from './logic';
import { MemoryStore, type MemoryData } from './memory-store';
import type { Favourite, Item } from './types';

/** Where the list is saved. On the phone this is @capacitor/preferences; tests pass a fake. */
export interface KeyValue {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const ITEMS_KEY = 'solo.items';
const FAVS_KEY = 'solo.favourites';

function parse<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

const validItem = (i: Item) => typeof i?.id === 'string' && typeof i.name === 'string' && isCategory(i.category);
const validFav = (f: Favourite) => typeof f?.id === 'string' && typeof f.name === 'string' && isCategory(f.category);

/** The Basket Solo store: the whole list lives on this phone, saved after every change. */
export class LocalStore extends MemoryStore {
  private saving: Promise<void> = Promise.resolve();

  private constructor(private kv: KeyValue, data: MemoryData) {
    super(data);
  }

  static async open(kv: KeyValue): Promise<LocalStore> {
    const [rawItems, rawFavs] = await Promise.all([kv.get(ITEMS_KEY), kv.get(FAVS_KEY)]);
    const items = (parse<Item>(rawItems) ?? []).filter(validItem);
    const savedFavs = parse<Favourite>(rawFavs);
    const firstRun = savedFavs === null;
    const favourites = firstRun
      ? DEFAULT_FAVOURITES.map((f, order) => ({ ...f, order, id: `fav-${order}` }))
      : savedFavs.filter(validFav);
    const store = new LocalStore(kv, { items, favourites });
    if (firstRun) store.changed();
    return store;
  }

  /** Resolves once everything changed so far has been written. */
  flush(): Promise<void> {
    return this.saving;
  }

  protected override changed() {
    const { items, favourites } = this.snapshot();
    // Chain the writes so they land in order.
    this.saving = this.saving
      .then(() => Promise.all([this.kv.set(ITEMS_KEY, JSON.stringify(items)), this.kv.set(FAVS_KEY, JSON.stringify(favourites))]))
      .then(() => {}, (e) => console.error('Could not save the list', e));
  }
}

export async function openPhoneStore(): Promise<LocalStore> {
  const { Preferences } = await import('@capacitor/preferences');
  return LocalStore.open({
    get: async (key) => (await Preferences.get({ key })).value,
    set: (key, value) => Preferences.set({ key, value }),
  });
}
