import '@fontsource-variable/inter';
import './styles.css';

import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { isSolo } from './edition';
import { DEFAULT_FAVOURITES } from './logic';
import { loadPrefs, savePref, type Theme } from './prefs';
import type { ListStore } from './store';
import type { AppState, Ctx } from './ui/context';
import { closeTopOverlay } from './ui/feedback';
import { renderList } from './ui/list-view';
import { notifyWatchers } from './ui/settings-view';
import { renderNotConfigured, renderSetup } from './ui/setup-view';

const root = document.getElementById('app')!;

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const bg = theme === 'dark' ? '#111413' : '#f6f4ef';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  if (Capacitor.isNativePlatform()) {
    StatusBar.setBackgroundColor({ color: bg }).catch(() => {});
    StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
  }
}

async function demoStore(): Promise<ListStore> {
  const { DemoStore } = await import('./demo-store');
  const now = Date.now();
  const min = 60_000;
  let id = 0;
  const item = (name: string, category: string, addedBy: string, ago: number, extra: object = {}) =>
    ({ id: `demo${id++}`, name, category, addedBy, addedAt: now - ago * min, qty: 1, note: '', purchased: false, ...extra }) as never;
  return new DemoStore({
    favourites: DEFAULT_FAVOURITES.map((f, order) => ({ ...f, order, id: `fav${order}` })),
    items: [
      item('Bananas', 'produce', 'Sam', 300),
      item('Cherry tomatoes', 'produce', 'Dave', 200, { note: 'The small vine ones' }),
      item('Sourdough', 'bakery', 'Sam', 180),
      item('Milk', 'dairy', 'Dave', 120, { qty: 2, note: 'Semi-skimmed' }),
      item('Greek yoghurt', 'dairy', 'Sam', 90),
      item('Chicken thighs', 'meat', 'Dave', 60, { note: 'Boneless' }),
      item('Washing-up liquid', 'household', 'Sam', 30),
      item('Coffee beans', 'drinks', 'Dave', 400, { purchased: true, purchasedBy: 'Sam', purchasedAt: now - 5 * min }),
      item('Eggs', 'dairy', 'Sam', 500, { qty: 12, purchased: true, purchasedBy: 'Sam', purchasedAt: now - 8 * min }),
    ],
  });
}

async function openStore(demo: boolean): Promise<ListStore> {
  if (demo) return demoStore();
  if (isSolo) return (await import('./local-store')).openPhoneStore();
  return new (await import('./firebase-store')).FirebaseStore();
}

async function main() {
  const demo = new URLSearchParams(location.search).has('demo');
  // The Solo build never touches Firebase; this branch is removed from its bundle entirely.
  if (!isSolo && !demo && !(await import('./firebase-config')).isFirebaseConfigured()) {
    applyTheme('dark');
    renderNotConfigured(root);
    return;
  }

  const prefs = demo ? { name: 'Dave', code: 'demo', theme: 'dark' as Theme } : await loadPrefs();
  // Solo has one list on this phone: no name or household code needed.
  if (isSolo) Object.assign(prefs, { name: prefs.name || 'Me', code: 'local' });
  applyTheme(prefs.theme);

  const store = await openStore(demo);

  const state: AppState = {
    items: [],
    favourites: [],
    name: prefs.name,
    code: prefs.code,
    theme: prefs.theme,
    sync: 'synced',
    purchasedOpen: true,
    loaded: false,
  };

  let frame = 0;
  const render = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (state.code) {
        renderList(ctx, root);
        notifyWatchers();
      }
    });
  };

  const ctx: Ctx = {
    store,
    state,
    demo,
    render,
    setName(name) {
      state.name = name;
      void savePref('name', name);
    },
    setTheme(theme) {
      state.theme = theme;
      applyTheme(theme);
      void savePref('theme', theme);
    },
    leaveHousehold() {
      store.close();
      state.code = '';
      state.items = [];
      state.favourites = [];
      state.loaded = false;
      void savePref('code', '');
      showSetup();
    },
  };

  store.onItems((items) => {
    state.items = items;
    state.loaded = true;
    render();
  });
  store.onFavourites((favs) => {
    state.favourites = favs;
    render();
  });
  store.onSync((s) => {
    if (s === state.sync) return;
    state.sync = s;
    render();
  });

  const openHousehold = (code: string) => {
    state.code = code;
    store.open(code);
    render();
  };

  const showSetup = () =>
    renderSetup(root, store, (name, code) => {
      state.name = name;
      void savePref('name', name);
      void savePref('code', code);
      openHousehold(code);
    });

  if (state.code && state.name) openHousehold(state.code);
  else showSetup();

  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('backButton', () => {
      if (!closeTopOverlay()) void CapApp.minimizeApp();
    });
  }
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeTopOverlay());
}

void main();
