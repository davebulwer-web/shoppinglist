import type { ListStore } from './store';
import type { Favourite, Item, NewFavourite, NewItem, SyncState } from './types';

/** In-memory store for trying the UI in a browser with ?demo (no Firebase needed). */
export class DemoStore implements ListStore {
  private items: Item[] = [];
  private favs: Favourite[] = [];
  private itemsCb: (items: Item[]) => void = () => {};
  private favsCb: (favs: Favourite[]) => void = () => {};
  private next = 1;

  constructor(seed?: { items: Omit<Item, 'id'>[]; favourites: Omit<Favourite, 'id'>[] }) {
    if (seed) {
      this.items = seed.items.map((i) => ({ ...i, id: this.id() }));
      this.favs = seed.favourites.map((f) => ({ ...f, id: this.id() }));
    }
  }

  private id() { return `demo${this.next++}`; }
  private emit() {
    this.itemsCb(this.items.map((i) => ({ ...i })));
    this.favsCb([...this.favs].sort((a, b) => a.order - b.order).map((f) => ({ ...f })));
  }

  async householdExists() { return true; }
  async createHousehold(_code: string, favourites: Omit<NewFavourite, 'order'>[]) {
    this.favs = favourites.map((f, order) => ({ ...f, order, id: this.id() }));
  }
  open() { queueMicrotask(() => this.emit()); }
  close() {}
  onItems(cb: (items: Item[]) => void) { this.itemsCb = cb; }
  onFavourites(cb: (favs: Favourite[]) => void) { this.favsCb = cb; }
  onSync(cb: (state: SyncState) => void) { cb('synced'); }

  async addItem(item: NewItem) { this.items.push({ ...item, id: this.id() }); this.emit(); }
  async updateItem(id: string, patch: Partial<NewItem>) {
    this.items = this.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    this.emit();
  }
  async deleteItem(id: string) { this.items = this.items.filter((i) => i.id !== id); this.emit(); }
  async deleteItems(ids: string[]) { this.items = this.items.filter((i) => !ids.includes(i.id)); this.emit(); }
  async restoreItems(items: Item[]) { this.items.push(...items); this.emit(); }

  async addFavourite(fav: NewFavourite) { this.favs.push({ ...fav, id: this.id() }); this.emit(); }
  async updateFavourite(id: string, patch: Partial<NewFavourite>) {
    this.favs = this.favs.map((f) => (f.id === id ? { ...f, ...patch } : f));
    this.emit();
  }
  async deleteFavourite(id: string) { this.favs = this.favs.filter((f) => f.id !== id); this.emit(); }
  async reorderFavourites(ids: string[]) {
    this.favs = this.favs.map((f) => ({ ...f, order: ids.indexOf(f.id) }));
    this.emit();
  }
}
