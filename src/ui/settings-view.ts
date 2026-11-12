import { category, type CategoryId } from '../categories';
import { APP_NAME, isSolo } from '../edition';
import type { Favourite } from '../types';
import type { Ctx } from './context';
import { h, icon } from './dom';
import { confirmSheet, openPanel, openSheet, tap, toast } from './feedback';
import { ICONS } from './icons';
import { categoryPicker, stepper } from './item-sheet';

declare const __APP_VERSION__: string;

/** Sheet for adding or editing a quick-add button. */
function openFavouriteSheet(ctx: Ctx, fav?: Favourite) {
  const name = h('input', { class: 'input input-lg', attrs: { type: 'text', placeholder: 'Button name, e.g. Milk', maxlength: 40, 'aria-label': 'Name' } });
  name.value = fav?.name ?? '';
  const qty = stepper(fav?.defaultQty ?? 1);
  const cats = categoryPicker(fav?.category ?? ('other' as CategoryId));

  const save = () => {
    const n = name.value.trim().replace(/\s+/g, ' ');
    if (!n) return name.focus();
    if (fav) void ctx.store.updateFavourite(fav.id, { name: n, defaultQty: qty.get(), category: cats.get() });
    else {
      const order = ctx.state.favourites.reduce((m, f) => Math.max(m, f.order), -1) + 1;
      void ctx.store.addFavourite({ name: n, defaultQty: qty.get(), category: cats.get(), order });
    }
    tap();
    close();
  };

  const body = h(
    'form',
    { class: 'sheet-body', onsubmit: (e: Event) => { e.preventDefault(); save(); } },
    name,
    h('div', { class: 'field-row' }, h('span', { class: 'label', text: 'Adds' }), qty.el),
    h('span', { class: 'label', text: 'Aisle' }),
    cats.el,
    h('div', { class: 'row-buttons' }, h('button', { class: 'btn btn-primary', attrs: { type: 'submit' }, text: fav ? 'Save' : 'Add button' })),
  );
  const close = openSheet(fav ? 'Edit quick-add button' : 'New quick-add button', body);
  if (!fav) window.setTimeout(() => name.focus(), 300);
}

function section(title: string, ...children: (Node | false | null | undefined)[]) {
  return h('section', { class: 'card' }, h('h3', { class: 'card-title', text: title }), ...children);
}

export function openSettings(ctx: Ctx, focus?: 'quick') {
  const panel = h('div', { class: 'panel', attrs: { role: 'dialog', 'aria-label': 'Settings' } });
  const content = h('div', { class: 'panel-content' });
  let quickSection: HTMLElement | undefined;

  const render = () => {
    const { state, store } = ctx;

    const nameInput = h('input', { class: 'input', attrs: { type: 'text', maxlength: 24, 'aria-label': 'Your name' } });
    nameInput.value = state.name;
    nameInput.addEventListener('change', () => {
      const n = nameInput.value.trim();
      if (n) {
        ctx.setName(n);
        toast('Name saved', undefined, 1500);
      } else nameInput.value = state.name;
    });

    const favs = state.favourites;
    const move = (i: number, d: number) => {
      const ids = favs.map((f) => f.id);
      [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
      void store.reorderFavourites(ids);
      tap();
    };

    quickSection = section(
      'Quick-add buttons',
      h('p', { class: 'muted small', text: 'One tap on the main screen adds these. Reorder them to match how often you use them.' }),
      h(
        'ul',
        { class: 'fav-list' },
        ...favs.map((f, i) =>
          h(
            'li',
            { class: 'fav', style: `--cat:${category(f.category).color}` },
            h('span', { class: 'dot' }),
            h('button', { class: 'fav-name', onclick: () => openFavouriteSheet(ctx, f) },
              h('span', { text: f.name }),
              h('span', { class: 'muted small', text: `${category(f.category).label}${f.defaultQty > 1 ? ` · ×${f.defaultQty}` : ''}` })),
            h('button', { class: 'icon-btn small', attrs: { 'aria-label': `Move ${f.name} up`, disabled: i === 0 }, onclick: () => move(i, -1) }, icon(ICONS.up)),
            h('button', { class: 'icon-btn small', attrs: { 'aria-label': `Move ${f.name} down`, disabled: i === favs.length - 1 }, onclick: () => move(i, 1) }, icon(ICONS.down)),
            h('button', {
              class: 'icon-btn small danger',
              attrs: { 'aria-label': `Delete ${f.name}` },
              onclick: () => {
                void store.deleteFavourite(f.id);
                const { id: _id, ...rest } = f;
                toast(`Removed ${f.name} button`, { label: 'Undo', run: () => void store.addFavourite(rest) });
              },
            }, icon(ICONS.trash)),
          ),
        ),
      ),
      h('button', { class: 'btn btn-secondary btn-block', onclick: () => openFavouriteSheet(ctx) }, icon(ICONS.plus), 'Add a button'),
    );

    content.replaceChildren(
      ...[
      !isSolo && section('You', h('label', { class: 'label', text: 'Your name (shown on items you add)' }), nameInput),
      quickSection,
      !isSolo && section(
        'Household',
        h('p', { class: 'muted small', text: 'Your partner joins by entering this code on their phone. Keep it private — anyone with it can see and edit your list.' }),
        h(
          'div',
          { class: 'code-box' },
          h('code', { class: 'code', text: ctx.demo ? 'demo-mode' : state.code }),
          h('button', {
            class: 'icon-btn',
            attrs: { 'aria-label': 'Copy code' },
            onclick: async () => {
              try {
                await navigator.clipboard.writeText(state.code);
                toast('Code copied', undefined, 1500);
              } catch {
                toast('Couldn’t copy — long-press the code instead');
              }
            },
          }, icon(ICONS.copy)),
        ),
        h('button', {
          class: 'btn btn-ghost btn-danger-text btn-block',
          text: 'Leave this household',
          onclick: async () => {
            if (await confirmSheet('Leave household?', 'The list stays online. You can rejoin later with the same code.', 'Leave')) {
              close();
              ctx.leaveHousehold();
            }
          },
        }),
      ),
      section(
        'Appearance',
        h(
          'div',
          { class: 'segmented', attrs: { role: 'radiogroup' } },
          ...(['dark', 'light'] as const).map((t) =>
            h('button', {
              class: state.theme === t ? 'on' : '',
              attrs: { role: 'radio', 'aria-checked': state.theme === t },
              onclick: () => {
                ctx.setTheme(t);
                render();
              },
            }, icon(t === 'dark' ? ICONS.moon : ICONS.sun), t === 'dark' ? 'Dark' : 'Light'),
          ),
        ),
      ),
      h('p', { class: 'version', text: `${APP_NAME} ${__APP_VERSION__}${ctx.demo ? ' · demo mode' : ''}` }),
      ].filter((el): el is HTMLElement => el instanceof HTMLElement),
    );
  };

  panel.append(
    h('header', { class: 'top panel-top' },
      h('button', { class: 'icon-btn', attrs: { 'aria-label': 'Back' }, onclick: () => close() }, icon(ICONS.back)),
      h('h1', { class: 'title small-title', text: 'Settings' })),
    content,
  );

  render();
  // Keep the panel live while it is open (e.g. partner edits the quick-add buttons).
  const unwatch = watch(ctx, render);
  const close = openPanel(panel, unwatch);
  if (focus === 'quick') window.setTimeout(() => quickSection?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
}

// The app calls every registered watcher after each data change.
const watchers = new Set<() => void>();
function watch(_ctx: Ctx, fn: () => void) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}
export function notifyWatchers() {
  watchers.forEach((fn) => fn());
}
