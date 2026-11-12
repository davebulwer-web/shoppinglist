# Basket

A private shared shopping list for two Android phones. Either of you adds items, and whoever is at the shop ticks them off. Changes appear on the other phone within a second or so.

- **Quick-add buttons** for regular items (Bread, Milk, Sandwich…), which you can change in Settings.
- **Quantity, notes and aisles.** Items are grouped in shop order and the aisle is guessed for you.
- **Who added it** is shown on every item, and **who bought it** on ticked items.
- **"In the basket"** section for bought items, with a one-tap **Clear** (and Undo).
- **Works with poor signal.** Ticks made offline sync when you're back online.
- Dark and light themes.

Data lives in one central Firebase Firestore database. Nothing about the list is stored only on a phone.

## How the parts fit together

| Part | What it is |
| --- | --- |
| App | TypeScript + Vite web app (`src/`), wrapped as an Android app with Capacitor (`android/`) |
| Storage | Firebase Cloud Firestore at `households/{code}/items` and `households/{code}/favourites` |
| Sign-in | Firebase Anonymous Auth (invisible), plus a private **household code** such as `maple-otter-cloud-4821` |
| Security | `firestore.rules`: you can only reach a list if you know its exact code |
| APK | Built by GitHub Actions on every push (`.github/workflows/android.yml`) |

## Firebase setup (one time)

1. **Create a project** at <https://console.firebase.google.com> (the free Spark plan is plenty).
2. **Firestore:** *Databases & Storage → Firestore → Create database* (any location, production mode).
3. **Anonymous sign-in:** *Security → Authentication → Get started → Sign-in method → Anonymous → Enable → Save*.
4. **Rules:** *Firestore → Rules*. Replace everything with the contents of [`firestore.rules`](firestore.rules), then click **Publish**.
5. **Web app config:**
   - Go to *Project settings (gear) → General → Your apps → `</>` (Web)*, register an app called "Basket" (no Hosting), and copy the `firebaseConfig` values into [`src/firebase-config.ts`](src/firebase-config.ts).
   - These values are not secret. The rules and your household code protect the list.
6. Commit and push. GitHub Actions builds a new APK.

Until step 5 is done, the app shows an "Almost there" screen with a link to a demo.

## Installing on your phones

1. On GitHub, open the **Actions** tab, then the latest green **Build Android APK** run.
2. Download the **basket-apk** artifact (a zip containing `Basket.apk`). You need to be signed in to GitHub.
3. Get `Basket.apk` onto each phone, for example via Google Drive, email or a USB cable.
4. Open it on the phone. Android asks you to allow installs from that app the first time.
5. Every build is signed with the same key and has a higher version number, so new builds install over the old one and keep your settings.

## First run

1. **Phone 1:** enter your name, tap **Start a new list**, and note the household code.
2. **Phone 2:** enter your name, tap **Join my partner's list**, and type the code.

You can find the code again under **Settings → Household**. Keep it private, because anyone with the code can see and edit the list.

## Using it

- **Tap** an item to tick it off. Tap it again in "In the basket" to put it back.
- **Swipe left** to remove an item. **Long-press** to edit it.
- **+** adds an item. Press Enter on the keyboard to add it and start the next one straight away.
- Tap a **quick-add button** to add that item, or to raise its quantity if it's already on the list.

## Basket Solo (standalone edition)

**Basket Solo** is a separate APK for someone who wants the app just for themselves. It is built from the same code, but the whole list is stored on their phone:

- No Firebase, no account, no household code, and no internet needed. The Solo build contains no Firebase code or connection details at all.
- It has the same list, quick-add buttons, aisles, quantities, notes and Clear (with Undo) as Basket. There are no "who added" initials, because there is only one person.
- It has its own app ID (`uk.bulwer.shoppinglist.solo`), name and amber icon, so it can be installed alongside the shared Basket.
- **Limits:** it works on one phone only. Uninstalling the app deletes the list, though Android's Google backup may restore it on reinstall or on a new phone. Don't rely on that.

**Download:** in the latest **Build Android APK** run on the **Actions** tab, download **basket-solo-apk** (it contains `BasketSolo.apk`) and install it the same way as Basket.

To build it locally, run `npm run build:solo` (web) or `npm run android:apk:solo` (APK).

## Development

```bash
npm install
npm run dev          # http://localhost:5173/?demo uses an in-memory demo list, no Firebase needed
npm test             # unit tests (vitest)
npm run build        # type-check + production build
npm run android:apk  # local APK build of Basket (needs the Android SDK)
npm run android:apk:solo  # local APK build of Basket Solo
```

The debug signing key `android/app/basket-debug.keystore` is committed on purpose so every build can update the installed app. It is only suitable for a private, sideloaded app like this one.
