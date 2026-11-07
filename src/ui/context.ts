import type { Theme } from '../prefs';
import type { ListStore } from '../store';
import type { Favourite, Item, SyncState } from '../types';

export interface AppState {
  items: Item[];
  favourites: Favourite[];
  name: string;
  code: string;
  theme: Theme;
  sync: SyncState;
  purchasedOpen: boolean;
  loaded: boolean;
}

/** What every view gets: the store, the current state and a few app-level actions. */
export interface Ctx {
  store: ListStore;
  state: AppState;
  demo: boolean;
  render(): void;
  setName(name: string): void;
  setTheme(theme: Theme): void;
  leaveHousehold(): void;
}
