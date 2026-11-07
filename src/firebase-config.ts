// Paste the "firebaseConfig" object from the Firebase console here:
// Project settings -> General -> Your apps -> Web app -> SDK setup and configuration -> Config.
//
// These values are not secret (every Firebase web app ships them). The list is
// protected by the household code plus the rules in firestore.rules.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const isFirebaseConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
