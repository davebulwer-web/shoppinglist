import type { CategoryId } from './categories';

/** One thing on the shopping list. Stored at households/{code}/items/{id}. */
export interface Item {
  id: string;
  name: string;
  qty: number;
  note: string;
  category: CategoryId;
  addedBy: string;
  addedAt: number;
  purchased: boolean;
  purchasedBy?: string;
  purchasedAt?: number;
}

/** A quick-add button. Stored at households/{code}/favourites/{id}. */
export interface Favourite {
  id: string;
  name: string;
  category: CategoryId;
  defaultQty: number;
  order: number;
}

export type NewItem = Omit<Item, 'id'>;
export type NewFavourite = Omit<Favourite, 'id'>;

/** 'synced': everything is on the server. 'pending': local changes waiting to upload. 'offline': no connection. */
export type SyncState = 'synced' | 'pending' | 'offline';
