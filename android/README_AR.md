# STEEL DESIGN ERP Android — V11.2

هذا الفرع مستقل: `android-clean-start`. تم تضمين ملف HTML المرسل `STEEL_DESIGN_ERP_V11_2_PRODUCTION_BUTTON.html` كما هو داخل:
`app/src/main/assets/www/index.html`.

## البناء
يتطلب JDK 17 وAndroid SDK (Platform 35) وGradle 8.9:
```bash
cd android
gradle assembleDebug
```
الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`.

التطبيق يعمل بواجهة WebView محلية مع JavaScript وDOM Storage، ويدعم اختيار الملفات من الهاتف. لم يتم الادعاء بإجراء اختبار على جهاز فعلي. يجب اختبار الكاميرا والطباعة مع الطابعة الفعلية قبل الاستخدام التشغيلي.
