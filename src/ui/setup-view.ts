import { generateCode, isValidCode, normaliseCode } from '../household';
import { DEFAULT_FAVOURITES } from '../logic';
import type { ListStore } from '../store';
import { h, icon } from './dom';
import { toast } from './feedback';
import { ICONS } from './icons';

/** First-run screens: your name, then create a household or join your partner's. */
export function renderSetup(root: HTMLElement, store: ListStore, done: (name: string, code: string) => void) {
  let name = '';

  const brand = () =>
    h('div', { class: 'brand' }, h('div', { class: 'logo' }, icon(ICONS.basket)), h('h1', { class: 'title big', text: 'Basket' }), h('p', { class: 'muted', text: 'One shared shopping list for the two of you.' }));

  const stepName = () => {
    const input = h('input', { class: 'input input-lg', attrs: { type: 'text', placeholder: 'Your first name', maxlength: 24, autocapitalize: 'words', 'aria-label': 'Your first name' } });
    input.value = name;
    const go = (mode: 'create' | 'join') => {
      name = input.value.trim();
      if (!name) {
        input.focus();
        input.classList.add('shake');
        window.setTimeout(() => input.classList.remove('shake'), 400);
        return;
      }
      if (mode === 'create') void create();
      else stepJoin();
    };
    root.replaceChildren(
      h(
        'div',
        { class: 'setup' },
        brand(),
        h('div', { class: 'card' },
          h('label', { class: 'label', text: 'What should we call you?' }),
          input,
          h('button', { class: 'btn btn-primary btn-block', text: 'Start a new list', onclick: () => go('create') }),
          h('button', { class: 'btn btn-secondary btn-block', text: 'Join my partner’s list', onclick: () => go('join') })),
      ),
    );
  };

  const busy = (label: string) =>
    root.replaceChildren(h('div', { class: 'setup' }, brand(), h('div', { class: 'card center' }, h('div', { class: 'spinner' }), h('p', { class: 'muted', text: label }))));

  const create = async () => {
    const code = generateCode();
    busy('Creating your list…');
    try {
      await store.createHousehold(code, DEFAULT_FAVOURITES);
    } catch (e) {
      console.error(e);
      toast('Couldn’t reach the server. Check your connection and try again.');
      return stepName();
    }
    root.replaceChildren(
      h(
        'div',
        { class: 'setup' },
        brand(),
        h('div', { class: 'card' },
          h('h2', { class: 'card-title', text: 'Your household code' }),
          h('p', { class: 'muted small', text: 'On your partner’s phone, choose “Join my partner’s list” and enter this code. You can find it again in Settings.' }),
          h('div', { class: 'code-box' }, h('code', { class: 'code big', text: code }),
            h('button', {
              class: 'icon-btn',
              attrs: { 'aria-label': 'Copy code' },
              onclick: () => navigator.clipboard.writeText(code).then(() => toast('Code copied', undefined, 1500), () => {}),
            }, icon(ICONS.copy))),
          h('button', { class: 'btn btn-primary btn-block', text: 'Open the list', onclick: () => done(name, code) })),
      ),
    );
  };

  const stepJoin = () => {
    const input = h('input', { class: 'input input-lg mono', attrs: { type: 'text', placeholder: 'e.g. maple-otter-cloud-4821', autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Household code' } });
    const error = h('p', { class: 'error' });
    const join = async () => {
      const code = normaliseCode(input.value);
      if (!isValidCode(code)) {
        error.textContent = 'That doesn’t look right — it’s three words and four numbers, like maple-otter-cloud-4821.';
        return;
      }
      busy('Finding your list…');
      try {
        if (!(await store.householdExists(code))) {
          stepJoin();
          toast('No list found with that code. Check it with your partner.');
          return;
        }
      } catch (e) {
        console.error(e);
        stepJoin();
        toast('Couldn’t reach the server. Check your connection and try again.');
        return;
      }
      done(name, code);
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && void join());
    root.replaceChildren(
      h(
        'div',
        { class: 'setup' },
        brand(),
        h('div', { class: 'card' },
          h('label', { class: 'label', text: 'Enter the code from your partner’s phone (Settings → Household)' }),
          input,
          error,
          h('button', { class: 'btn btn-primary btn-block', text: 'Join', onclick: () => void join() }),
          h('button', { class: 'btn btn-ghost btn-block', text: 'Back', onclick: stepName })),
      ),
    );
    window.setTimeout(() => input.focus(), 50);
  };

  stepName();
}

/** Shown when src/firebase-config.ts hasn't been filled in yet. */
export function renderNotConfigured(root: HTMLElement) {
  root.replaceChildren(
    h('div', { class: 'setup' },
      h('div', { class: 'brand' }, h('div', { class: 'logo' }, icon(ICONS.basket)), h('h1', { class: 'title big', text: 'Basket' })),
      h('div', { class: 'card' },
        h('h2', { class: 'card-title', text: 'Almost there' }),
        h('p', { class: 'muted', text: 'This build isn’t connected to a Firebase project yet. Follow the “Firebase setup” steps in the README, paste the config into src/firebase-config.ts, then rebuild the APK.' }),
        h('a', { class: 'btn btn-secondary btn-block', attrs: { href: '?demo' }, text: 'Try the demo instead' }))),
  );
}
