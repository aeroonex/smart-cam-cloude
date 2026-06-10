import { Link } from "react-router-dom";
import { StaticPageHeader } from "@/components/StaticPageHeader";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <StaticPageHeader />

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Foydalanish Shartlari</h1>
          <p className="text-xs text-neutral-400 mt-1">Oxirgi yangilanish: 2026-yil 1-iyun</p>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5 space-y-5 text-sm text-neutral-700 leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">1. Umumiy qoidalar</h2>
            <p>
              <strong>HammaBop</strong> (aigate.uz) — O'zbekistonda faoliyat yurituvchi onlayn
              savdo platformasi. Ushbu Foydalanish Shartlari ilovadan foydalangan holda
              avtomatik ravishda qabul qilingan hisoblanadi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">2. Xizmat tavsifi</h2>
            <p>HammaBop quyidagi xizmatlarni taqdim etadi:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Onlayn mahsulotlar katalogi va qidiruv</li>
              <li>Elektron savat va buyurtma berish</li>
              <li>Kuryer va o'z-o'zidan olib ketish orqali yetkazib berish</li>
              <li>Cashback va bonus dasturi</li>
              <li>Telegram orqali buyurtma kuzatuvi</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">3. Foydalanuvchi majburiyatlari</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To'g'ri shaxsiy ma'lumotlar kiritish</li>
              <li>Buyurtma berishda haqiqiy manzil ko'rsatish</li>
              <li>Yetkazib berish vaqtida kuryer bilan aloqada bo'lish</li>
              <li>Platformani qonunga zid maqsadlarda ishlatmaslik</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">4. To'lov va narxlar</h2>
            <p>
              Barcha narxlar O'zbek so'mida (UZS) ko'rsatiladi. To'lov naqd pul,
              Click, Payme yoki boshqa taqdim etilgan usullar orqali amalga oshiriladi.
              Buyurtma tasdiqlangandan keyin narx o'zgarmaydi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">5. Qaytarish va bekor qilish</h2>
            <p>
              Buyurtma yetkazilguncha bekor qilish mumkin. Mahsulot qabul qilingandan
              keyin 24 soat ichida nuqson yuzasidan murojaat qilish huquqi mavjud.
              Qaytarish shartlari har bir mahsulot sahifasida ko'rsatiladi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">6. Cashback dasturi</h2>
            <p>
              Har bir muvaffaqiyatli buyurtmadan 2% cashback hisoblanadi. Cashback
              keyingi xaridlarda ishlatilishi mumkin. Bonus balans naqd pulga
              almashinmaydi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">7. Google OAuth</h2>
            <p>
              Ilovaga Google hisobi orqali kirish ixtiyoriy. Google autentifikatsiyasidan
              foydalanish Google-ning o'z Foydalanish Shartlariga ham bo'ysunadi.
              Biz foydalanuvchi parolini ko'rmaymiz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">8. Javobgarlikni cheklash</h2>
            <p>
              HammaBop yetkazib berish kechikishlari, ya'ni bizdan mustaqil sabablarga
              ko'ra kechikishlar uchun javobgar emas. Kuch majburiyat holatlari
              (ofat, urush, hukumat qarorlari) da platforma o'z majburiyatlaridan
              vaqtincha ozod etilishi mumkin.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">9. Shartlarga o'zgartirishlar</h2>
            <p>
              HammaBop ushbu shartlarni istalgan vaqtda yangilash huquqini saqlaydi.
              O'zgartirishlar aigate.uz saytida e'lon qilinadi. Ilovadan keyingi
              foydalanish yangi shartlarni qabul qilish deb hisoblanadi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-neutral-900 text-base">10. Aloqa</h2>
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
