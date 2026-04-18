# دليل تحويل التطبيق إلى Android و iOS

## ✅ نعم، التطبيق الحالي يدعم Android و iOS!

يمكنك تحويل التطبيق الحالي (React/Vite) إلى تطبيقات Android و iOS باستخدام **Capacitor**.

---

## 📱 دعم Android و iOS

### المزايا:
- ✅ **كود واحد** لجميع المنصات (Android, iOS, Web)
- ✅ **أداء عالي** - يعمل كتطبيق أصلي
- ✅ **وصول كامل** إلى APIs الجهاز (الكاميرا، GPS، الإشعارات، إلخ)
- ✅ **سهولة الصيانة** - كود واحد فقط

---

## 🚀 خطوات التحويل

### المتطلبات الأساسية

#### لـ Android:
1. **Node.js** (الإصدار 18 أو أحدث)
2. **Android Studio** (أحدث إصدار)
3. **Java JDK** (الإصدار 17 أو أحدث)
4. **Android SDK** (يتم تثبيته تلقائياً مع Android Studio)

#### لـ iOS:
1. **macOS** (مطلوب - لا يمكن بناء iOS على Windows)
2. **Xcode** (أحدث إصدار من App Store)
3. **CocoaPods** (`sudo gem install cocoapods`)
4. **Node.js** (الإصدار 18 أو أحدث)

---

## 📲 خطوات تحويل التطبيق

### الخطوة 1: تثبيت Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### الخطوة 2: تهيئة Capacitor

```bash
npx cap init
```

عند تشغيل `npx cap init`، سيُطلب منك:
- **App name**: `Luxe Cuts`
- **App ID**: `com.luxecuts.app`
- **Web dir**: `dist`

### الخطوة 3: بناء التطبيق

```bash
npm run build
```

### الخطوة 4: إضافة المنصات

#### لـ Android:
```bash
npx cap add android
```

#### لـ iOS (على macOS فقط):
```bash
npx cap add ios
```

### الخطوة 5: فتح المشروع

#### لـ Android:
```bash
npx cap open android
```
أو افتح المجلد `android` في Android Studio

#### لـ iOS (على macOS فقط):
```bash
npx cap open ios
```
أو افتح المجلد `ios` في Xcode

---

## 🔄 تحديث التطبيق بعد التعديلات

بعد أي تعديلات على الكود:

```bash
npm run build
npx cap sync
```

أو بشكل منفصل:

```bash
# لـ Android فقط
npm run build
npx cap sync android

# لـ iOS فقط
npm run build
npx cap sync ios
```

---

## 📱 تشغيل التطبيق

### على Android:
1. افتح Android Studio
2. اختر جهاز Android (محاكي أو جهاز حقيقي)
3. اضغط Run (▶️)

### على iOS:
1. افتح Xcode
2. اختر جهاز iOS (محاكي أو جهاز حقيقي)
3. اضغط Run (▶️)

---

## 🛠️ أوامر سريعة

تم إضافة الأوامر التالية في `package.json`:

```bash
# Android
npm run android:sync    # بناء ومزامنة مع Android
npm run android:open    # فتح المشروع في Android Studio

# iOS (على macOS فقط)
npm run ios:sync        # بناء ومزامنة مع iOS
npm run ios:open        # فتح المشروع في Xcode
```

---

## ⚙️ إعدادات إضافية

### الصلاحيات (Android)

في `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### الصلاحيات (iOS)

في `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>نحتاج للكاميرا لالتقاط الصور</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>نحتاج للمكتبة لاختيار الصور</string>
```

### Firebase

إذا كنت تستخدم Firebase:
- **Android**: أضف `google-services.json` في `android/app/`
- **iOS**: أضف `GoogleService-Info.plist` في `ios/App/App/`

---

## 📦 بناء ملفات التثبيت

### Android APK:
```bash
cd android
./gradlew assembleRelease
```
الملف سيكون في: `android/app/build/outputs/apk/release/app-release.apk`

### Android App Bundle (لـ Google Play):
```bash
cd android
./gradlew bundleRelease
```

### iOS (في Xcode):
1. اختر Product → Archive
2. اتبع خطوات رفع التطبيق

---

## ✅ الميزات المدعومة

- ✅ جميع ميزات React/Vite
- ✅ Firebase (مع الإعدادات الصحيحة)
- ✅ الإشعارات المحلية
- ✅ الكاميرا والمكتبة
- ✅ GPS والموقع
- ✅ التخزين المحلي
- ✅ الاتصال بالإنترنت
- ✅ مشاركة الملفات

---

## 🎯 ملاحظات مهمة

1. **iOS يتطلب macOS**: لا يمكن بناء تطبيقات iOS على Windows
2. **التحديثات**: بعد أي تعديل، قم بتشغيل `npm run build` ثم `npx cap sync`
3. **الأداء**: التطبيق يعمل كتطبيق أصلي، لذا الأداء ممتاز
4. **التوافق**: يدعم Android 5.0+ و iOS 13+

---

## 🆘 استكشاف الأخطاء

### مشاكل شائعة:

**Android:**
- تأكد من تثبيت Android SDK و Java JDK
- تأكد من أن `dist` موجود بعد `npm run build`

**iOS:**
- تأكد من تثبيت Xcode و CocoaPods
- قم بتشغيل `pod install` في مجلد `ios/App`
- تأكد من أنك على macOS

---

## 📚 موارد إضافية

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio)
- [Xcode Guide](https://developer.apple.com/xcode/)
