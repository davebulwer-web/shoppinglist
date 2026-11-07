type Child = Node | string | number | false | null | undefined;
type Props = {
  class?: string;
  text?: string;
  html?: string;
  style?: string;
  attrs?: Record<string, string | number | boolean | undefined>;
  dataset?: Record<string, string>;
} & { [K in `on${string}`]?: (e: never) => void };

/** Tiny element builder: h('button', { class: 'x', onclick }, 'Label'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined) continue;
      if (key === 'class') el.className = value as string;
      else if (key === 'text') el.textContent = value as string;
      else if (key === 'html') el.innerHTML = value as string;
      else if (key === 'style') el.setAttribute('style', value as string);
      else if (key === 'attrs') {
        for (const [a, v] of Object.entries(value as Record<string, unknown>)) {
          if (v === false || v === undefined) continue;
          el.setAttribute(a, v === true ? '' : String(v));
        }
      } else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value as EventListener);
    }
  }
  for (const child of children) {
    if (child === false || child === null || child === undefined) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

/** An inline SVG icon from the icon set. */
export function icon(svg: string, cls = 'icon'): HTMLSpanElement {
  return h('span', { class: cls, html: svg, attrs: { 'aria-hidden': 'true' } });
}
