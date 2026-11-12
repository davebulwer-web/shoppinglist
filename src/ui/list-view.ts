import { category } from '../categories';
import { APP_NAME, isSolo } from '../edition';
import { groupByCategory, initials, planQuickAdd, purchasedItems } from '../logic';
import type { Favourite, Item } from '../types';
import type { Ctx } from './context';
import { h, icon } from './dom';
import { confirmSheet, tap, toast } from './feedback';
import { ICONS } from './icons';
import { openItemSheet } from './item-sheet';
import { openSettings } from './settings-view';

const SWIPE_DELETE = 0.35; // fraction of the row width
const LONG_PRESS_MS = 480;

function quickAdd(ctx: Ctx, fav: Favourite, chip: HTMLElement) {
  const plan = planQuickAdd(ctx.state.items, fav);
  chip.classList.remove('pop');
  void chip.offsetWidth; // restart the animation
  chip.classList.add('pop');
  tap();
  if (plan.kind === 'bump') {
    void ctx.store.updateItem(plan.item.id, { qty: plan.qty });
    toast(`${fav.name} ×${plan.qty}`, undefined, 1800);
  } else {
    void ctx.store.addItem({
      name: fav.name,
      qty: Math.max(1, fav.defaultQty),
      note: '',
      category: fav.category,
      addedBy: ctx.state.name,
      addedAt: Date.now(),
      purchased: false,
    });
    toast(`Added ${fav.name}`, undefined, 1800);
  }
}

function setPurchased(ctx: Ctx, item: Item, purchased: boolean) {
  void ctx.store.updateItem(item.id, purchased
    ? { purchased: true, purchasedBy: ctx.state.name, purchasedAt: Date.now() }
    : { purchased: false, purchasedBy: undefined, purchasedAt: undefined });
}

/** One list row: tap to tick, swipe left to remove, long-press to edit. */
function itemRow(ctx: Ctx, item: Item): HTMLElement {
  const cat = category(item.category);
  const content = h(
    'div',
    { class: 'row-content' },
    h('span', { class: 'tick', attrs: { 'aria-hidden': 'true' } }, icon(ICONS.check)),
    h(
      'div',
      { class: 'row-text' },
      h('div', { class: 'row-title' }, h('span', { class: 'row-name', text: item.name }), item.qty > 1 && h('span', { class: 'qty', text: `×${item.qty}` })),
      (item.note || (item.purchased && !isSolo)) &&
        h('div', {
          class: 'row-note',
          text: item.purchased && item.purchasedBy && !isSolo ? `Got by ${item.purchasedBy}${item.note ? ` · ${item.note}` : ''}` : item.note,
        }),
    ),
    !isSolo && item.addedBy && h('span', { class: 'avatar', text: initials(item.addedBy), attrs: { title: `Added by ${item.addedBy}` } }),
  );
  const row = h(
    'li',
    {
      class: `row${item.purchased ? ' done' : ''}`,
      style: `--cat:${cat.color}`,
      attrs: { role: 'checkbox', 'aria-checked': item.purchased, tabindex: 0, 'aria-label': `${item.name}${item.qty > 1 ? `, ${item.qty}` : ''}` },
    },
    h('div', { class: 'row-delete' }, icon(ICONS.trash)),
    content,
  );

  let startX = 0;
  let startY = 0;
  let dx = 0;
  let mode: 'idle' | 'press' | 'swipe' | 'scroll' | 'held' = 'idle';
  let timer: number | undefined;

  const toggle = () => {
    tap(item.purchased ? 'light' : 'medium');
    if (item.purchased) {
      setPurchased(ctx, item, false);
    } else {
      // Let the tick animate before the row moves down to "Purchased".
      row.classList.add('ticking');
      window.setTimeout(() => setPurchased(ctx, item, true), 320);
    }
  };

  const remove = () => {
    row.classList.add('removing');
    content.style.transform = 'translateX(-110%)';
    window.setTimeout(() => {
      void ctx.store.deleteItem(item.id);
      toast(`Removed ${item.name}`, { label: 'Undo', run: () => void ctx.store.restoreItems([item]) });
    }, 220);
  };

  row.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    mode = 'press';
    timer = window.setTimeout(() => {
      if (mode !== 'press') return;
      mode = 'held';
      tap('medium');
      openItemSheet(ctx, item);
    }, LONG_PRESS_MS);
  });
  row.addEventListener('pointermove', (e) => {
    if (mode !== 'press' && mode !== 'swipe') return;
    const mx = e.clientX - startX;
    const my = e.clientY - startY;
    if (mode === 'press') {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
        mode = 'scroll';
        window.clearTimeout(timer);
        return;
      }
      if (Math.abs(mx) > 10) {
        mode = 'swipe';
        window.clearTimeout(timer);
        row.setPointerCapture(e.pointerId);
        row.classList.add('swiping');
      } else return;
    }
    dx = Math.min(0, mx);
    content.style.transform = `translateX(${dx}px)`;
    row.classList.toggle('armed', -dx > row.offsetWidth * SWIPE_DELETE);
  });
  const end = () => {
    window.clearTimeout(timer);
    if (mode === 'swipe') {
      row.classList.remove('swiping');
      if (-dx > row.offsetWidth * SWIPE_DELETE) remove();
      else content.style.transform = '';
    } else if (mode === 'press') toggle();
    mode = 'idle';
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', () => {
    window.clearTimeout(timer);
    if (mode === 'swipe') {
      row.classList.remove('swiping');
      content.style.transform = '';
    }
    mode = 'idle';
  });
  row.addEventListener('contextmenu', (e) => e.preventDefault());
  row.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  });
  return row;
}

function syncBadge(ctx: Ctx) {
  if (isSolo) return h('span', { class: 'sync sync-local', text: 'Saved on this phone' });
  const labels = { synced: 'Synced', pending: 'Syncing…', offline: 'Offline · will sync' } as const;
  return h('span', { class: `sync sync-${ctx.state.sync}` }, h('span', { class: 'sync-dot' }), labels[ctx.state.sync]);
}

export function renderList(ctx: Ctx, root: HTMLElement) {
  const { state } = ctx;
  const groups = groupByCategory(state.items);
  const done = purchasedItems(state.items);
  const toBuy = groups.reduce((n, g) => n + g.items.length, 0);

  const header = h(
    'header',
    { class: 'top' },
    h(
      'div',
      { class: 'top-text' },
      h('h1', { class: 'title', text: APP_NAME }),
      h('div', { class: 'subtitle' }, h('span', { text: toBuy === 0 ? 'All done' : `${toBuy} to buy` }), h('span', { class: 'sep', text: '·' }), syncBadge(ctx)),
    ),
    h('button', { class: 'icon-btn', attrs: { 'aria-label': 'Settings' }, onclick: () => openSettings(ctx) }, icon(ICONS.settings)),
  );

  const chips = h(
    'div',
    { class: 'quick' },
    ...state.favourites.map((f) => {
      const chip: HTMLButtonElement = h('button', {
        class: 'chip',
        style: `--cat:${category(f.category).color}`,
        onclick: () => quickAdd(ctx, f, chip),
      }, icon(ICONS.plus, 'icon chip-plus'), f.name);
      return chip;
    }),
    h('button', { class: 'chip chip-ghost', attrs: { 'aria-label': 'Edit quick-add buttons' }, onclick: () => openSettings(ctx, 'quick') }, icon(ICONS.edit), 'Edit'),
  );

  const list = h('main', { class: 'list' });
  if (!state.loaded) {
    list.append(h('div', { class: 'empty' }, h('div', { class: 'spinner' })));
  } else if (toBuy === 0) {
    list.append(
      h(
        'div',
        { class: 'empty' },
        icon(ICONS.basket, 'icon empty-icon'),
        h('p', { class: 'empty-title', text: done.length ? 'Everything’s in the basket' : 'Nothing on the list' }),
        h('p', { class: 'muted', text: 'Tap + or a quick-add button to add something.' }),
      ),
    );
  }
  for (const g of groups) {
    const cat = category(g.category);
    list.append(
      h(
        'section',
        { class: 'group', style: `--cat:${cat.color}` },
        h('h2', { class: 'group-title' }, h('span', { class: 'dot' }), cat.label, h('span', { class: 'count', text: String(g.items.length) })),
        h('ul', { class: 'rows' }, ...g.items.map((i) => itemRow(ctx, i))),
      ),
    );
  }

  if (done.length) {
    const toggle = () => {
      state.purchasedOpen = !state.purchasedOpen;
      ctx.render();
    };
    list.append(
      h(
        'section',
        { class: `group purchased${state.purchasedOpen ? ' open' : ''}` },
        h(
          'div',
          { class: 'purchased-head' },
          h('button', { class: 'group-title as-button', attrs: { 'aria-expanded': state.purchasedOpen }, onclick: toggle },
            icon(ICONS.chevron, 'icon chev'), 'In the basket', h('span', { class: 'count', text: String(done.length) })),
          h('button', {
            class: 'btn btn-small btn-ghost',
            text: 'Clear',
            onclick: async () => {
              if (!(await confirmSheet('Clear the basket?', `Removes ${done.length} bought item${done.length === 1 ? '' : 's'}${isSolo ? '' : ' from both phones'}.`, 'Clear'))) return;
              void ctx.store.deleteItems(done.map((i) => i.id));
              tap('medium');
              toast(`Cleared ${done.length} item${done.length === 1 ? '' : 's'}`, { label: 'Undo', run: () => void ctx.store.restoreItems(done) }, 6000);
            },
          }),
        ),
        state.purchasedOpen && h('ul', { class: 'rows' }, ...done.map((i) => itemRow(ctx, i))),
      ),
    );
  }

  const fab = h('button', { class: 'fab', attrs: { 'aria-label': 'Add item' }, onclick: () => openItemSheet(ctx) }, icon(ICONS.plus));

  root.replaceChildren(header, chips, list, fab);
}
