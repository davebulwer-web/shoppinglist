import { MemoryStore } from './memory-store';

/** In-memory store for trying the UI in a browser with ?demo (no Firebase needed). */
export class DemoStore extends MemoryStore {}
