import type { ListStore } from './store';
import type { Favourite, Item, NewFavourite, NewItem, SyncState } from './types';

export interface MemoryData {
  items: Item[];
  favourites: Favourite[];
}

let fallbackId = 0;
function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${(fallbackId++).toString(36)}`;
}

/** A ListStore that keeps everything in memory. Used for ?demo and as the base of the on-phone store. */
export class MemoryStore implements ListStore {
  protected items: Item[] = [];
  protected favs: Favourite[] = [];
  private itemsCb: (items: Item[]) => void = () => {};
  private favsCb: (favs: Favourite[]) => void = () => {};

  constructor(data?: Partial<MemoryData>) {
    if (data) this.load(data);
  }

  protected load(data: Partial<MemoryData>) {
    this.items = data.items ? data.items.map((i) => ({ ...i })) : [];
    this.favs = data.favourites ? data.favourites.map((f) => ({ ...f })) : [];
  }

  snapshot(): MemoryData {
    return { items: this.items.map((i) => ({ ...i })), favourites: [...this.favs].sort((a, b) => a.order - b.order).map((f) => ({ ...f })) };
  }

  /** Called after every change; subclasses persist here. */
  protected changed() {}

  private emit() {
    const snap = this.snapshot();
    this.itemsCb(snap.items);
    this.favsCb(snap.favourites);
  }

  private commit() {
    this.changed();
    this.emit();
  }

  async householdExists() { return true; }
  async createHousehold(_code: string, favourites: Omit<NewFavourite, 'order'>[]) {
    this.favs = favourites.map((f, order) => ({ ...f, order, id: newId() }));
    this.commit();
  }
  open() { queueMicrotask(() => this.emit()); }
  close() {}
  onItems(cb: (items: Item[]) => void) { this.itemsCb = cb; }
  onFavourites(cb: (favs: Favourite[]) => void) { this.favsCb = cb; }
  onSync(cb: (state: SyncState) => void) { cb('synced'); }

  async addItem(item: NewItem) { this.items.push({ ...item, id: newId() }); this.commit(); }
  async updateItem(id: string, patch: Partial<NewItem>) {
    this.items = this.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    this.commit();
  }
  async deleteItem(id: string) { this.items = this.items.filter((i) => i.id !== id); this.commit(); }
  async deleteItems(ids: string[]) { this.items = this.items.filter((i) => !ids.includes(i.id)); this.commit(); }
  async restoreItems(items: Item[]) {
    const ids = new Set(items.map((i) => i.id));
    this.items = [...this.items.filter((i) => !ids.has(i.id)), ...items.map((i) => ({ ...i }))];
    this.commit();
  }

  async addFavourite(fav: NewFavourite) { this.favs.push({ ...fav, id: newId() }); this.commit(); }
  async updateFavourite(id: string, patch: Partial<NewFavourite>) {
    this.favs = this.favs.map((f) => (f.id === id ? { ...f, ...patch } : f));
    this.commit();
  }
  async deleteFavourite(id: string) { this.favs = this.favs.filter((f) => f.id !== id); this.commit(); }
  async reorderFavourites(ids: string[]) {
    this.favs = this.favs.map((f) => ({ ...f, order: ids.indexOf(f.id) }));
    this.commit();
  }
}
