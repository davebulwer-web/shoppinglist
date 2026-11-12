/** Which build this is: the shared Firebase app, or the standalone on-phone "Solo" app. */
export const isSolo = import.meta.env.VITE_EDITION === 'solo';
export const APP_NAME = isSolo ? 'Basket Solo' : 'Basket';
