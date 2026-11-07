import { initializeApp } from 'firebase/app';
import { indexedDBLocalPersistence, initializeAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentSingleTabManager,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { isCategory } from './categories';
import { firebaseConfig } from './firebase-config';
import type { ListStore } from './store';
import type { Favourite, Item, NewFavourite, NewItem, SyncState } from './types';

function toItem(id: string, d: DocumentData): Item {
  return {
    id,
    name: String(d.name ?? ''),
    qty: Number(d.qty) || 1,
    note: String(d.note ?? ''),
    category: isCategory(d.category) ? d.category : 'other',
    addedBy: String(d.addedBy ?? ''),
    addedAt: Number(d.addedAt) || 0,
    purchased: Boolean(d.purchased),
    purchasedBy: d.purchasedBy ? String(d.purchasedBy) : undefined,
    purchasedAt: d.purchasedAt ? Number(d.purchasedAt) : undefined,
  };
}

function toFavourite(id: string, d: DocumentData): Favourite {
  return {
    id,
    name: String(d.name ?? ''),
    category: isCategory(d.category) ? d.category : 'other',
    defaultQty: Number(d.defaultQty) || 1,
    order: Number(d.order) || 0,
  };
}

/** Firestore rejects undefined fields, so drop them before writing. */
function clean<T extends object>(data: T): DocumentData {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

export class FirebaseStore implements ListStore {
  private db: Firestore;
  private auth: Auth;
  private signedIn: Promise<void>;
  private code = '';
  private unsubs: Unsubscribe[] = [];
  private itemsCb: (items: Item[]) => void = () => {};
  private favsCb: (favs: Favourite[]) => void = () => {};
  private syncCb: (s: SyncState) => void = () => {};
  private pending = { items: false, favs: false };
  private fromCache = false;

  constructor() {
    const app = initializeApp(firebaseConfig);
    // initializeAuth (not getAuth) avoids loading the popup/redirect helpers, which a WebView doesn't need.
    this.auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
    // The on-device cache lets the list open and be ticked off with no signal; changes upload later.
    this.db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });
    this.signedIn = this.signIn();
    window.addEventListener('online', () => this.emitSync());
    window.addEventListener('offline', () => this.emitSync());
  }

  /** Signs this phone in anonymously (remembered across launches), retrying until there is signal. */
  private async signIn(): Promise<void> {
    await this.auth.authStateReady();
    for (let attempt = 0; !this.auth.currentUser; attempt++) {
      try {
        await signInAnonymously(this.auth);
      } catch (e) {
        console.warn('Sign-in failed, retrying', e);
        await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** attempt)));
      }
    }
  }

  private col(name: 'items' | 'favourites', code = this.code) {
    return collection(this.db, 'households', code, name);
  }

  async householdExists(code: string): Promise<boolean> {
    await this.signedIn;
    const snap = await getDoc(doc(this.db, 'households', code));
    return snap.exists();
  }

  async createHousehold(code: string, favourites: Omit<NewFavourite, 'order'>[]): Promise<void> {
    await this.signedIn;
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, 'households', code), { createdAt: serverTimestamp() });
    favourites.forEach((f, order) => batch.set(doc(this.col('favourites', code)), { ...f, order }));
    await batch.commit();
  }

  open(code: string): void {
    this.close();
    this.code = code;
    void this.signedIn.then(() => {
      if (this.code !== code) return;
      this.unsubs.push(
        onSnapshot(this.col('items'), { includeMetadataChanges: true }, (snap) => {
          this.pending.items = snap.metadata.hasPendingWrites;
          this.fromCache = snap.metadata.fromCache;
          this.emitSync();
          this.itemsCb(snap.docs.map((d) => toItem(d.id, d.data())));
        }),
        onSnapshot(this.col('favourites'), { includeMetadataChanges: true }, (snap) => {
          this.pending.favs = snap.metadata.hasPendingWrites;
          this.emitSync();
          this.favsCb(snap.docs.map((d) => toFavourite(d.id, d.data())).sort((a, b) => a.order - b.order));
        }),
      );
    });
  }

  close(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.code = '';
  }

  private emitSync() {
    const offline = !navigator.onLine || this.fromCache;
    this.syncCb(offline ? 'offline' : this.pending.items || this.pending.favs ? 'pending' : 'synced');
  }

  onItems(cb: (items: Item[]) => void) { this.itemsCb = cb; }
  onFavourites(cb: (favs: Favourite[]) => void) { this.favsCb = cb; }
  onSync(cb: (state: SyncState) => void) { this.syncCb = cb; }

  // Writes are not awaited by the UI for the server round-trip: Firestore applies them
  // locally at once and syncs in the background, which also makes offline use work.
  async addItem(item: NewItem) { void addDoc(this.col('items'), clean(item)); }
  async updateItem(id: string, patch: Partial<NewItem>) {
    // purchasedBy/purchasedAt become undefined when unticking; store them as null.
    const data = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? null : v]));
    void updateDoc(doc(this.col('items'), id), data);
  }
  async deleteItem(id: string) { void deleteDoc(doc(this.col('items'), id)); }
  async deleteItems(ids: string[]) {
    const batch = writeBatch(this.db);
    ids.forEach((id) => batch.delete(doc(this.col('items'), id)));
    void batch.commit();
  }
  async restoreItems(items: Item[]) {
    const batch = writeBatch(this.db);
    items.forEach(({ id, ...rest }) => batch.set(doc(this.col('items'), id), clean(rest)));
    void batch.commit();
  }

  async addFavourite(fav: NewFavourite) { void addDoc(this.col('favourites'), clean(fav)); }
  async updateFavourite(id: string, patch: Partial<NewFavourite>) { void updateDoc(doc(this.col('favourites'), id), clean(patch)); }
  async deleteFavourite(id: string) { void deleteDoc(doc(this.col('favourites'), id)); }
  async reorderFavourites(idsInOrder: string[]) {
    const batch = writeBatch(this.db);
    idsInOrder.forEach((id, order) => batch.update(doc(this.col('favourites'), id), { order }));
    void batch.commit();
  }
}
