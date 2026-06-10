import { Link } from "react-router-dom";
import { StaticPageHeader } from "@/components/StaticPageHeader";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <StaticPageHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Maxfiylik Siyosati</h1>
          <p className="text-xs text-neutral-400 mt-1">Oxirgi yangilanish: 2026-yil 1-iyun</p>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5 space-y-5 text-sm text-neutral-700 leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">1. Ilova haqida</h2>
            <p>
              <strong>HammaBop</strong> — O'zbekistonda faoliyat yurituvchi onlayn marketplace ilova bo'lib,
              foydalanuvchilarga mahsulotlar sotib olish, buyurtma berish va yetkazib olish imkoniyatini taqdim etadi.
              Ushbu Maxfiylik Siyosati aigate.uz domenida joylashgan HammaBop ilovasi uchun amal qiladi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">2. To'planadigan ma'lumotlar</h2>
            <p>Biz quyidagi ma'lumotlarni to'playmiz:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Ism va familiya</li>
              <li>Telefon raqami</li>
              <li>Elektron pochta manzili (Google orqali kirish tanlansa)</li>
              <li>Manzil va viloyat (yetkazib berish uchun)</li>
              <li>Buyurtma tarixi</li>
              <li>Telegram ID (ixtiyoriy, bildirishnomalar uchun)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">3. Ma'lumotlardan foydalanish maqsadi</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Buyurtmalarni qayta ishlash va yetkazib berish</li>
              <li>Foydalanuvchi hisobini boshqarish</li>
              <li>Cashback va bonus balanslarini hisoblash</li>
              <li>Buyurtma holati bo'yicha bildirishnomalar yuborish</li>
              <li>Mijozlarga texnik yordam ko'rsatish</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">4. Google OAuth orqali kirish</h2>
            <p>
              Foydalanuvchilar Google hisobi orqali ilovaga kira oladi. Google OAuth faqat quyidagi
              ma'lumotlarni olishga ruxsat so'raydi:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Elektron pochta manzili</li>
              <li>Ism (profil uchun)</li>
              <li>Profil rasmi (ixtiyoriy)</li>
            </ul>
            <p>
              Biz Google foydalanuvchisining parolini ko'rmaymiz va saqlamaymiz.
              Ma'lumotlar faqat HammaBop ilovasi doirasida ishlatiladi va uchinchi shaxslarga
              sotilmaydi yoki uzatilmaydi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">5. Ma'lumotlarni saqlash</h2>
            <p>
              Barcha ma'lumotlar Supabase (supabase.com) xavfsiz bulut bazasida saqlanadi.
              Ma'lumotlar SSL/TLS protokoli orqali shifrlangan holda uzatiladi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">6. Foydalanuvchi huquqlari</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>O'z ma'lumotlaringizni ko'rish va tahrirlash huquqi</li>
              <li>Hisobni o'chirish so'rovi (support@aigate.uz ga murojaat)</li>
              <li>Ma'lumotlar to'planishidan voz kechish huquqi</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">7. Murojaat uchun</h2>
            <p>
              Savollar yoki shikoyatlar bo'lsa, biz bilan bog'laning:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Email: <a href="mailto:support@aigate.uz" className="text-neutral-900 font-semibold underline">support@aigate.uz</a></li>
              <li>Telegram: <a href="https://t.me/HammaBopSupport" className="text-neutral-900 font-semibold underline" target="_blank" rel="noopener noreferrer">@HammaBopSupport</a></li>
              <li>Veb-sayt: <a href="https://aigate.uz" className="text-neutral-900 font-semibold underline">aigate.uz</a></li>
            </ul>
          </section>
        </div>

        <div className="text-center">
          <Link to="/" className="inline-block rounded-2xl bg-black px-6 py-3 text-sm font-bold text-white">
            ← Bosh sahifaga qaytish
          </Link>
        </div>
      </main>
    </div>
  );
}
