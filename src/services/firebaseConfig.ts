import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// إعدادات Firebase - يجب استبدالها بإعداداتك الحقيقية
// للحصول على الإعدادات:
// 1. اذهب إلى https://console.firebase.google.com
// 2. أنشئ مشروع جديد أو اختر مشروع موجود
// 3. اضغط على أيقونة الإعدادات > Project settings
// 4. في قسم "Your apps" اضغط على "Add app" واختر Web
// 5. انسخ إعدادات firebaseConfig من هناك
// For production, set VITE_FIREBASE_* in `.env.local` (see `.env.example`). Storage bucket must match
// Firebase Console → Project settings → Your apps (same value as "storageBucket" in the web config snippet).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDemoKeyReplaceWithYourOwn',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'luxe-cuts-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'luxe-cuts-demo',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'luxe-cuts-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:123456789:web:abcdef',
};

/** True while placeholder API key is used — Storage uploads are skipped (local blob URLs only). */
export const IS_DEMO_FIREBASE = firebaseConfig.apiKey.includes('DemoKeyReplaceWithYourOwn');

/** When false (real `VITE_FIREBASE_*` in `.env.local`), app data is read/written to Firestore instead of in-memory mock state. */
export const USE_FIRESTORE_DATA = !IS_DEMO_FIREBASE;

if (typeof window !== 'undefined' && import.meta.env.DEV && IS_DEMO_FIREBASE) {
  console.warn(
    '[Firebase] Placeholder config: set VITE_FIREBASE_* in .env.local (see .env.example) for Storage, Auth, and Firestore.'
  );
}

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
