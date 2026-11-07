import type { Favourite, Item, NewFavourite, NewItem, SyncState } from './types';

/** Everything the UI needs from storage. Implemented by Firestore, and in memory for ?demo. */
export interface ListStore {
  /** Create a new household (seeding the quick-add buttons), or join one. */
  createHousehold(code: string, favourites: Omit<NewFavourite, 'order'>[]): Promise<void>;
  householdExists(code: string): Promise<boolean>;

  open(code: string): void;
  close(): void;

  onItems(cb: (items: Item[]) => void): void;
  onFavourites(cb: (favs: Favourite[]) => void): void;
  onSync(cb: (state: SyncState) => void): void;

  addItem(item: NewItem): Promise<void>;
  updateItem(id: string, patch: Partial<NewItem>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  /** Delete several items in one go (Clear purchased). */
  deleteItems(ids: string[]): Promise<void>;
  /** Put deleted items back with their original ids (Undo). */
  restoreItems(items: Item[]): Promise<void>;

  addFavourite(fav: NewFavourite): Promise<void>;
  updateFavourite(id: string, patch: Partial<NewFavourite>): Promise<void>;
  deleteFavourite(id: string): Promise<void>;
  reorderFavourites(idsInOrder: string[]): Promise<void>;
}
