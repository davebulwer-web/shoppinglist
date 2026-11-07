// Household codes look like "maple-otter-cloud-4821". The code is the only key to
// the list, so it is long enough that it cannot be guessed (~7 x 10^10 options).

const WORDS = [
  'amber', 'apple', 'aspen', 'basil', 'beach', 'berry', 'birch', 'bloom', 'brook', 'cedar',
  'cherry', 'cider', 'clover', 'cloud', 'cobalt', 'comet', 'copper', 'coral', 'cosmos', 'crane',
  'daisy', 'delta', 'dune', 'ember', 'falcon', 'fern', 'fig', 'finch', 'fjord', 'flint',
  'forest', 'fox', 'frost', 'garnet', 'ginger', 'glade', 'granite', 'grove', 'harbor', 'hazel',
  'heron', 'honey', 'indigo', 'island', 'ivy', 'jade', 'jasper', 'juniper', 'kestrel', 'kiwi',
  'lagoon', 'lark', 'lemon', 'lilac', 'linen', 'lotus', 'lunar', 'mango', 'maple', 'marble',
  'meadow', 'mint', 'misty', 'moss', 'nectar', 'nutmeg', 'oak', 'ocean', 'olive', 'onyx',
  'opal', 'orchid', 'otter', 'owl', 'pebble', 'pepper', 'pine', 'plum', 'polar', 'poppy',
  'quartz', 'quill', 'raven', 'reef', 'ripple', 'river', 'robin', 'rowan', 'saffron', 'sage',
  'salt', 'sierra', 'silver', 'slate', 'solar', 'spruce', 'stone', 'storm', 'summit', 'swift',
  'thistle', 'thyme', 'tide', 'tulip', 'velvet', 'violet', 'walnut', 'willow', 'winter', 'wren',
];

export const CODE_PATTERN = /^[a-z]+-[a-z]+-[a-z]+-[0-9]{4}$/;

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function generateCode(rand: (max: number) => number = randomInt): string {
  const words = [0, 1, 2].map(() => WORDS[rand(WORDS.length)]);
  const digits = String(rand(10000)).padStart(4, '0');
  return [...words, digits].join('-');
}

/** Forgive how people type a code: capitals, spaces instead of hyphens, stray spaces. */
export function normaliseCode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
