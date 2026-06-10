# 🔔 Firebase Push Notification — sodda qo'llanma (HammaBop)

Push faqat **ilova yopiq turganda ekranga banner** chiqarish uchun kerak.
Gradle sozlamalari loyihada allaqachon tayyor — siz faqat 2 ta narsa qilasiz:
**(A)** `google-services.json` faylini joyiga tashlash, **(B)** Supabase'ga 1 ta maxfiy qo'shish.

---

## QISM A — google-services.json (telefonda push qabul qilish uchun)

### 1-qadam. Firebase loyiha ochish
1. Brauzerda oching: **https://console.firebase.google.com**
2. Google akkauntingiz bilan kiring (bepul).
3. **"Add project" / "Loyiha qo'shish"** ni bosing.
4. Nom: `HammaBop` deb yozing → **Continue**.
5. "Google Analytics" so'ralsa — **o'chirib qo'ying (Disable)** → **Create project**.
6. ~30 soniya kuting → **Continue**.

### 2-qadam. Android ilovani qo'shish
1. Loyiha ichida **Android belgisini** (yoki "Add app" → Android) bosing.
2. **Android package name** maydoniga aynan shuni yozing:
   ```
   uz.hammabop.app
   ```
   ⚠️ Bir harf ham xato bo'lmasin — bu ilovangizning ID si.
3. App nickname: `HammaBop` (ixtiyoriy).
4. **Register app** ni bosing.

### 3-qadam. Faylni yuklab olib joyiga tashlash
1. **"Download google-services.json"** tugmasini bosing — fayl yuklanadi.
2. Bu faylni quyidagi papkaga ko'chiring (nusxalang):
   ```
   android/app/google-services.json
   ```
   To'liq yo'l: `C:\Users\Surface PC\dyad-apps\smart-cam-cloude\android\app\google-services.json`
3. Firebase'da qolgan "Add SDK" qadamlarini **o'tkazib yuboring (Next → Next → Continue to console)** — ularni Capacitor avtomat qiladi.

✅ Qism A tugadi. Endi telefon push qabul qila oladi.

---

## QISM B — Supabase maxfiysi (serverdan push yuborish uchun)

### 4-qadam. Service account kalitini olish
1. Firebase Console → yuqori chapdagi ⚙️ **Project settings**.
2. Yuqoridan **"Service accounts"** tabiga o'ting.
3. **"Generate new private key"** → **Generate key** → JSON fayl yuklanadi.
4. Bu faylni **Notepad/VS Code** da oching va **butun ichini** (`{` dan `}` gacha) nusxalang.

### 5-qadam. Supabase'ga qo'yish
1. Oching: **https://supabase.com/dashboard/project/vhbrbptcnkzkfdbxehgt/settings/functions**
   (yoki: Project → Settings → Edge Functions → Secrets)
2. **"Add new secret"**:
   - Name: `FCM_SERVICE_ACCOUNT`
   - Value: 4-qadamda nusxalagan **butun JSON** matni
3. **Save**.

✅ Qism B tugadi. Endi server push yubora oladi.

---

## QISM C — Ilovani qayta yig'ish

Terminalda (loyiha papkasida):
```bash
pnpm i
npx cap sync android
npx cap open android
```
Android Studio'da **Run** ni bosing yoki APK build qiling.

---

## ✅ Tekshirish
- Ilovaga kirgan foydalanuvchining tokeni avtomat `push_tokens` jadvaliga yoziladi.
- Test push yuborish (Supabase SQL Editor yoki istalgan joydan):
  ```
  POST https://vhbrbptcnkzkfdbxehgt.supabase.co/functions/v1/send-push
  Body: { "role": "admin", "title": "Salom", "body": "Test push 🎉" }
  ```

## ❓ Tez-tez so'raladigan
- **Pul to'lanadimi?** — Yo'q, Firebase push bepul (cheksiz).
- **google-services.json ni git'ga qo'shaymi?** — Ixtiyoriy, lekin maxfiy emas (faqat token kalitlari). Service account JSON esa **hech qachon** git'ga qo'shilmasin.
- **Push'siz ishlaydimi?** — Ha, qolgan 14 funksiya to'liq ishlaydi. Bu qadamlarni keyin ham qilsangiz bo'ladi.
