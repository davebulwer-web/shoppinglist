export const CATEGORIES = [
  { id: 'produce', label: 'Fruit & Veg', color: '#7dc58a' },
  { id: 'bakery', label: 'Bakery', color: '#e3b56c' },
  { id: 'meat', label: 'Meat & Fish', color: '#e5806f' },
  { id: 'dairy', label: 'Dairy & Eggs', color: '#e2c25c' },
  { id: 'frozen', label: 'Frozen', color: '#8ec8ea' },
  { id: 'cupboard', label: 'Cupboard', color: '#c9a27e' },
  { id: 'drinks', label: 'Drinks', color: '#b59ce0' },
  { id: 'household', label: 'Household', color: '#9fb6ca' },
  { id: 'toiletries', label: 'Toiletries', color: '#e8a6c8' },
  { id: 'other', label: 'Other', color: '#a3a8a5' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

const BY_ID = new Map<string, (typeof CATEGORIES)[number]>(CATEGORIES.map((c) => [c.id, c]));

export function isCategory(id: unknown): id is CategoryId {
  return typeof id === 'string' && BY_ID.has(id);
}

export function category(id: string) {
  return BY_ID.get(id) ?? BY_ID.get('other')!;
}

/** Position of a category in walking-round-the-shop order. */
export function categoryOrder(id: string): number {
  const i = CATEGORIES.findIndex((c) => c.id === id);
  return i === -1 ? CATEGORIES.length : i;
}

const KEYWORDS: Record<Exclude<CategoryId, 'other'>, string[]> = {
  produce: ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berr', 'melon', 'pear', 'peach', 'plum', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'lettuce', 'salad', 'cucumber', 'pepper', 'broccoli', 'spinach', 'mushroom', 'courgette', 'herb', 'ginger', 'veg', 'fruit', 'leek', 'celery', 'cabbage', 'kale', 'sweetcorn', 'parsnip', 'cauliflower', 'chilli', 'basil', 'coriander'],
  bakery: ['bread', 'loaf', 'roll', 'bagel', 'croissant', 'wrap', 'pitta', 'naan', 'muffin', 'crumpet', 'cake', 'baguette', 'brioche', 'tortilla', 'bun', 'scone', 'doughnut', 'donut'],
  meat: ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey', 'steak', 'fish', 'salmon', 'tuna', 'cod', 'prawn', 'chorizo', 'salami', 'meat'],
  dairy: ['milk', 'cheese', 'butter', 'yoghurt', 'yogurt', 'cream', 'egg', 'cheddar', 'mozzarella', 'halloumi', 'feta', 'custard', 'creme fraiche'],
  frozen: ['frozen', 'ice cream', 'ice', 'peas', 'chips', 'fish fingers', 'pizza', 'ice lolly'],
  cupboard: ['pasta', 'rice', 'flour', 'sugar', 'cereal', 'oats', 'porridge', 'tin', 'beans', 'soup', 'sauce', 'oil', 'vinegar', 'salt', 'spice', 'stock', 'jam', 'honey', 'peanut', 'nuts', 'crisps', 'biscuit', 'chocolate', 'noodle', 'ketchup', 'mayo', 'mustard', 'spread', 'marmite', 'lentil', 'chickpea', 'gravy'],
  drinks: ['coffee', 'tea', 'juice', 'water', 'squash', 'cola', 'coke', 'lemonade', 'wine', 'beer', 'lager', 'cider', 'gin', 'prosecco', 'drink', 'tonic'],
  household: ['toilet roll', 'loo roll', 'kitchen roll', 'bin bag', 'washing', 'detergent', 'bleach', 'cleaner', 'sponge', 'foil', 'cling', 'dishwasher', 'fabric', 'bulb', 'batter', 'tissue', 'sandwich bag', 'freezer bag', 'spray'],
  toiletries: ['shampoo', 'conditioner', 'soap', 'shower', 'toothpaste', 'toothbrush', 'deodorant', 'razor', 'plaster', 'paracetamol', 'ibuprofen', 'sun cream', 'moisturiser', 'floss', 'mouthwash', 'cotton', 'tampon', 'pads'],
};

/** Best-guess category for a new item name, so the add sheet can pre-select an aisle. */
export function guessCategory(name: string): CategoryId {
  const n = ` ${name.toLowerCase().trim()} `;
  if (!n.trim()) return 'other';
  let best: CategoryId = 'other';
  let bestLen = 0;
  for (const [cat, words] of Object.entries(KEYWORDS) as [CategoryId, string[]][]) {
    for (const w of words) {
      // Prefer the longest matching keyword, so "toilet roll" beats "roll" and "ice cream" beats "cream".
      if (w.length > bestLen && n.includes(w)) {
        best = cat;
        bestLen = w.length;
      }
    }
  }
  return best;
}
