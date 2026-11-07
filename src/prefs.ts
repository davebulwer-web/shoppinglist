import { Preferences } from '@capacitor/preferences';

// Only these small settings live on the phone. The list itself is in Firestore.
export type Theme = 'dark' | 'light';

export interface LocalPrefs {
  name: string;
  code: string;
  theme: Theme;
}

export async function loadPrefs(): Promise<LocalPrefs> {
  const [name, code, theme] = await Promise.all(
    ['name', 'code', 'theme'].map(async (key) => (await Preferences.get({ key })).value ?? ''),
  );
  return { name, code, theme: theme === 'light' ? 'light' : 'dark' };
}

export async function savePref<K extends keyof LocalPrefs>(key: K, value: LocalPrefs[K]): Promise<void> {
  if (value) await Preferences.set({ key, value });
  else await Preferences.remove({ key });
}
