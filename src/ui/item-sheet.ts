import { CATEGORIES, guessCategory, type CategoryId } from '../categories';
import { isSolo } from '../edition';
import { findOpenItem, rememberedCategory, suggestions } from '../logic';
import type { Item } from '../types';
import type { Ctx } from './context';
import { h, icon } from './dom';
import { confirmSheet, openSheet, tap, toast } from './feedback';
import { ICONS } from './icons';

/** A row of category chips; returns the element and a getter/setter for the selected one. */
export function categoryPicker(initial: CategoryId, onPick?: (c: CategoryId) => void) {
  let selected = initial;
  const wrap = h('div', { class: 'cat-picker', attrs: { role: 'radiogroup', 'aria-label': 'Aisle' } });
  const buttons = CATEGORIES.map((c) =>
    h(
      'button',
      {
        class: 'cat-chip',
        style: `--cat:${c.color}`,
        attrs: { type: 'button', role: 'radio' },
        onclick: () => {
          set(c.id);
          onPick?.(c.id);
        },
      },
      h('span', { class: 'dot' }),
      c.label,
    ),
  );
  wrap.append(...buttons);
  const set = (id: CategoryId) => {
    selected = id;
    buttons.forEach((b, i) => {
      const on = CATEGORIES[i].id === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  };
  set(initial);
  return { el: wrap, get: () => selected, set };
}

/** Number stepper used for quantities. */
export function stepper(initial: number, min = 1, max = 99) {
  let value = initial;
  const out = h('span', { class: 'stepper-value', attrs: { 'aria-live': 'polite' } });
  const update = () => (out.textContent = String(value));
  const btn = (svg: string, d: number, label: string) =>
    h('button', {
      class: 'stepper-btn',
      attrs: { type: 'button', 'aria-label': label },
      onclick: () => {
        value = Math.min(max, Math.max(min, value + d));
        update();
        tap();
      },
    }, icon(svg));
  update();
  const el = h('div', { class: 'stepper' }, btn(ICONS.minus, -1, 'Less'), out, btn(ICONS.plus, 1, 'More'));
  return { el, get: () => value, set: (v: number) => { value = v; update(); } };
}

/** Bottom sheet for adding a new item, or editing an existing one. */
export function openItemSheet(ctx: Ctx, existing?: Item) {
  const { store, state } = ctx;
  let categoryTouched = Boolean(existing);

  const nameInput = h('input', {
    class: 'input input-lg',
    attrs: {
      type: 'text',
      placeholder: 'What do we need?',
      autocomplete: 'off',
      autocapitalize: 'sentences',
      enterkeyhint: existing ? 'done' : 'next',
      maxlength: 60,
      'aria-label': 'Item name',
    },
  });
  nameInput.value = existing?.name ?? '';

  const noteInput = h('input', {
    class: 'input',
    attrs: { type: 'text', placeholder: 'Note (brand, size, “only if on offer”…)', maxlength: 120, 'aria-label': 'Note' },
  });
  noteInput.value = existing?.note ?? '';

  const qty = stepper(existing?.qty ?? 1);
  const cats = categoryPicker(existing?.category ?? 'other', () => (categoryTouched = true));
  const suggestBox = h('div', { class: 'suggestions' });

  const autoCategory = () => {
    if (categoryTouched) return;
    const name = nameInput.value;
    cats.set(rememberedCategory(name, state.favourites, state.items) ?? guessCategory(name));
  };

  const renderSuggestions = () => {
    suggestBox.replaceChildren(
      ...suggestions(nameInput.value, state.favourites, state.items, 4).map((s) =>
        h('button', {
          class: 'suggestion',
          text: s.name,
          attrs: { type: 'button' },
          onclick: () => {
            nameInput.value = s.name;
            if (!categoryTouched) cats.set(s.category);
            suggestBox.replaceChildren();
            noteInput.focus();
          },
        }),
      ),
    );
  };

  nameInput.addEventListener('input', () => {
    autoCategory();
    renderSuggestions();
  });

  const save = (keepOpen: boolean) => {
    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      nameInput.focus();
      nameInput.classList.add('shake');
      window.setTimeout(() => nameInput.classList.remove('shake'), 400);
      return;
    }
    const note = noteInput.value.trim();
    if (existing) {
      void store.updateItem(existing.id, { name, note, qty: qty.get(), category: cats.get() });
      close();
      return;
    }
    const dupe = findOpenItem(state.items, name);
    if (dupe) {
      const newQty = dupe.qty + qty.get();
      void store.updateItem(dupe.id, { qty: newQty, note: note || dupe.note });
      toast(`${dupe.name} is already on the list — now ×${newQty}`);
    } else {
      void store.addItem({
        name,
        note,
        qty: qty.get(),
        category: cats.get(),
        addedBy: state.name,
        addedAt: Date.now(),
        purchased: false,
      });
      if (keepOpen) toast(`Added ${name}`, undefined, 1800);
    }
    tap();
    if (keepOpen) {
      // Ready for the next item straight away.
      nameInput.value = '';
      noteInput.value = '';
      qty.set(1);
      categoryTouched = false;
      cats.set('other');
      suggestBox.replaceChildren();
      nameInput.focus();
    } else close();
  };

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save(!existing);
    }
  });
  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save(false);
    }
  });

  const body = h(
    'form',
    { class: 'sheet-body', onsubmit: (e: Event) => { e.preventDefault(); save(false); } },
    nameInput,
    suggestBox,
    h('div', { class: 'field-row' }, h('span', { class: 'label', text: 'Quantity' }), qty.el),
    h('span', { class: 'label', text: 'Aisle' }),
    cats.el,
    noteInput,
    h(
      'div',
      { class: 'row-buttons' },
      existing &&
        h('button', {
          class: 'btn btn-ghost btn-danger-text',
          attrs: { type: 'button' },
          onclick: async () => {
            if (await confirmSheet(`Remove ${existing.name}?`, isSolo ? 'You can undo this straight after.' : 'It will disappear from both phones.', 'Remove')) {
              void store.deleteItem(existing.id);
              close();
              toast(`Removed ${existing.name}`, { label: 'Undo', run: () => void store.restoreItems([existing]) });
            }
          },
        }, icon(ICONS.trash), 'Remove'),
      h('button', { class: 'btn btn-primary', attrs: { type: 'submit' }, text: existing ? 'Save' : 'Add to list' }),
    ),
    !existing && h('p', { class: 'hint', text: 'Tip: press Enter on the keyboard to add and start the next item.' }),
  );

  const close = openSheet(existing ? 'Edit item' : 'Add item', body);
  if (!existing) window.setTimeout(() => nameInput.focus(), 300);
}
