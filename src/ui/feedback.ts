import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { h } from './dom';

let toastTimer: number | undefined;

/** A short message at the bottom of the screen, optionally with an action such as Undo. */
export function toast(message: string, action?: { label: string; run: () => void }, ms = 4500) {
  document.querySelector('.toast')?.remove();
  window.clearTimeout(toastTimer);
  const el = h(
    'div',
    { class: 'toast', attrs: { role: 'status' } },
    h('span', { text: message }),
    action &&
      h('button', {
        class: 'toast-action',
        text: action.label,
        onclick: () => {
          action.run();
          dismiss();
        },
      }),
  );
  const dismiss = () => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 250);
  };
  // While a sheet is open, show the toast at the top so it doesn't cover the sheet's buttons.
  if (document.querySelector('.sheet')) el.classList.add('at-top');
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  toastTimer = window.setTimeout(dismiss, ms);
}

export function tap(style: 'light' | 'medium' = 'light') {
  Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium }).catch(() => {});
}

// ---- Overlays (bottom sheets and full-screen panels) with Android back-button support ----

const stack: (() => void)[] = [];

/** Close the top-most sheet or panel. Returns false if nothing was open. */
export function closeTopOverlay(): boolean {
  const close = stack.at(-1);
  if (!close) return false;
  close();
  return true;
}

export function openSheet(title: string, body: HTMLElement, onClose?: () => void): () => void {
  const backdrop = h('div', { class: 'backdrop' });
  const sheet = h(
    'div',
    { class: 'sheet', attrs: { role: 'dialog', 'aria-label': title } },
    h('div', { class: 'sheet-handle' }),
    h('h2', { class: 'sheet-title', text: title }),
    body,
  );
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(close), 1);
    backdrop.classList.remove('show');
    sheet.classList.remove('show');
    window.setTimeout(() => {
      backdrop.remove();
      sheet.remove();
    }, 280);
    onClose?.();
  };
  backdrop.addEventListener('click', close);
  stack.push(close);
  document.body.append(backdrop, sheet);
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.classList.add('show');
  });
  return close;
}

export function openPanel(panel: HTMLElement, onClose?: () => void): () => void {
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(close), 1);
    panel.classList.remove('show');
    document.body.classList.remove('locked');
    window.setTimeout(() => panel.remove(), 280);
    onClose?.();
  };
  stack.push(close);
  document.body.classList.add('locked');
  document.body.append(panel);
  requestAnimationFrame(() => panel.classList.add('show'));
  return close;
}

/** A simple yes/no question in a bottom sheet. */
export function confirmSheet(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const body = h(
      'div',
      { class: 'sheet-body' },
      h('p', { class: 'muted', text: message }),
      h(
        'div',
        { class: 'row-buttons' },
        h('button', { class: 'btn btn-ghost', text: 'Cancel', onclick: () => close() }),
        h('button', {
          class: 'btn btn-danger',
          text: confirmLabel,
          onclick: () => {
            answered = true;
            resolve(true);
            close();
          },
        }),
      ),
    );
    const close = openSheet(title, body, () => {
      if (!answered) resolve(false);
    });
  });
}
