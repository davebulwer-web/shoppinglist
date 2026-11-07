// Paste the "firebaseConfig" object from the Firebase console here:
// Project settings -> General -> Your apps -> Web app -> SDK setup and configuration -> Config.
//
// These values are not secret (every Firebase web app ships them). The list is
// protected by the household code plus the rules in firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyB8bN2ugHUuojMijmYk6Dq_j76ZslXJduI',
  authDomain: 'shopping-list-4086a.firebaseapp.com',
  projectId: 'shopping-list-4086a',
  storageBucket: 'shopping-list-4086a.firebasestorage.app',
  messagingSenderId: '677503473138',
  appId: '1:677503473138:web:70e9b0b9a550211efa076b',
};

export const isFirebaseConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
