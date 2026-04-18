# ربط Firebase بالتطبيق (Backend)

## 1. إنشاء مشروع وتهيئة التطبيق

1. افتح [Firebase Console](https://console.firebase.google.com) وأنشئ مشروعاً أو اختر موجوداً.
2. أضف تطبيق **Web** من **Project settings → Your apps** وانسخ القيم إلى ملف **`.env.local`** في جذر المشروع (انظر `.env.example`).
3. تأكد أن **`VITE_FIREBASE_API_KEY`** لا يحتوي على النص `DemoKeyReplaceWithYourOwn` — عندها يُفعَّل تخزين **Firestore** الحقيقي تلقائياً (`USE_FIRESTORE_DATA`).

## 2. Authentication

1. من **Build → Authentication → Sign-in method** فعّل **Google**.
2. أضف **Authorized domains** (مثلاً `localhost`، نطاق الاستضافة، ونطاقات OAuth إن لزم).

## 3. Firestore

1. أنشئ قاعدة **Cloud Firestore** (وضع الإنتاج أو التجربة حسب حاجتك).
2. انشر القواعد من المشروع:

   ```bash
   firebase deploy --only firestore:rules
   ```

   أو انسخ محتوى `firestore.rules` إلى **Firestore → Rules** في الواجهة.

3. أنشئ مستندات **`users`** للأدوار (مثلاً `admin`، `barber`) مع الحقول المطلوبة (`uid`, `name`, `email`, `role`, `phone`, …) حسب ما يتوقعه التطبيق.

## 4. Storage

1. فعّل **Firebase Storage**.
2. انشر `storage.rules`:

   ```bash
   firebase deploy --only storage
   ```

## 5. البناء والمزامنة

```bash
npm run build
npx cap sync
```

بعد التعديل على `.env.local` أعد تشغيل `npm run dev` أو أعد البناء قبل `cap sync`.

## ملاحظات أمان

قواعد `firestore.rules` و`storage.rules` مُبسَّطة لتسهيل التطوير. قبل الإنتاج، قيّد الكتابة حسب الدور (مثلاً عبر **Custom Claims** أو دوال سحابية).
