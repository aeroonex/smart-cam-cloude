export default function AboutPage() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", background: "#f8fafc", color: "#1e293b", minHeight: "100vh" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        nav{background:#1d4f8a;padding:14px 24px;display:flex;align-items:center;gap:12px}
        .nav-logo{width:36px;height:36px;background:rgba(255,255,255,.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;flex-shrink:0}
        .nav-title{font-size:1.2rem;font-weight:800;color:white}
        .nav-domain{margin-left:auto;font-size:.78rem;color:rgba(255,255,255,.6)}
        .nav-open{margin-left:12px;background:white;color:#1d4f8a;padding:7px 18px;border-radius:50px;font-size:.82rem;font-weight:700;text-decoration:none;white-space:nowrap}
        .hero{background:linear-gradient(135deg,#0d2744 0%,#1d4f8a 60%,#2860a8 100%);color:white;padding:56px 24px 48px;text-align:center}
        .hero-badge{display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:50px;padding:6px 18px;font-size:.8rem;font-weight:600;margin-bottom:20px}
        .hero h1{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:900;line-height:1.2;margin-bottom:16px}
        .hero h1 span{color:#fbbf24}
        .hero p{font-size:1.05rem;color:rgba(255,255,255,.8);max-width:560px;margin:0 auto 28px}
        .hero-cta{display:inline-block;background:#fbbf24;color:#0d2744;padding:14px 32px;border-radius:50px;font-weight:800;font-size:1rem;text-decoration:none;margin-right:10px}
        .hero-cta-sec{display:inline-block;border:2px solid rgba(255,255,255,.4);color:white;padding:12px 28px;border-radius:50px;font-weight:700;font-size:.95rem;text-decoration:none}
        section{max-width:900px;margin:0 auto;padding:52px 24px}
        section h2{font-size:1.5rem;font-weight:800;color:#0f172a;margin-bottom:10px}
        section .lead{font-size:1rem;color:#475569;margin-bottom:28px;max-width:620px}
        .features{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
        .feature-card{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:22px}
        .feature-icon{font-size:1.8rem;margin-bottom:10px}
        .feature-card h3{font-size:.95rem;font-weight:700;color:#1d4f8a;margin-bottom:6px}
        .feature-card p{font-size:.85rem;color:#64748b}
        .oauth-box{background:#f0f6ff;border:1px solid #bfdbfe;border-radius:16px;padding:28px 32px}
        .oauth-box h3{font-size:1.1rem;font-weight:800;color:#1d4f8a;margin-bottom:12px}
        .oauth-box ul{list-style:none}
        .oauth-box li{padding:6px 0;font-size:.9rem;color:#334155;display:flex;align-items:flex-start;gap:8px}
        .oauth-box li::before{content:"✓";color:#1d4f8a;font-weight:700;flex-shrink:0;margin-top:1px}
        .steps{display:flex;flex-direction:column;gap:14px}
        .step{display:flex;align-items:flex-start;gap:16px;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px}
        .step-num{width:36px;height:36px;background:#1d4f8a;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;flex-shrink:0}
        .step-body h4{font-size:.95rem;font-weight:700;color:#0f172a;margin-bottom:4px}
        .step-body p{font-size:.85rem;color:#64748b}
        .cta-band{background:#1d4f8a;color:white;text-align:center;padding:44px 24px}
        .cta-band h2{font-size:1.5rem;font-weight:800;margin-bottom:10px}
        .cta-band p{color:rgba(255,255,255,.75);margin-bottom:24px}
        .cta-band a{background:#fbbf24;color:#0d2744;padding:14px 36px;border-radius:50px;font-weight:800;font-size:1rem;text-decoration:none;display:inline-block}
        footer{background:#0f172a;color:rgba(255,255,255,.5);text-align:center;padding:28px 24px;font-size:.82rem}
        footer a{color:#93c5fd;text-decoration:none}
        .footer-links{display:flex;justify-content:center;flex-wrap:wrap;gap:20px;margin-bottom:14px}
        .divider{border:none;border-top:1px solid #e2e8f0;margin:0}
        @media(max-width:600px){.hero{padding:40px 16px 36px}section{padding:36px 16px}.hero-cta,.hero-cta-sec{display:block;margin:8px auto;max-width:240px;text-align:center}}
      `}</style>

      <nav>
        <div className="nav-logo">H</div>
        <span className="nav-title">HammaBop - Online marketplace</span>
        <span className="nav-domain">aigate.uz</span>
        <a className="nav-open" href="https://aigate.uz/">Ilovani ochish</a>
      </nav>

      <div className="hero">
        <div className="hero-badge">🛍️ O'zbekiston Onlayn Marketplace</div>
        <h1><span>HammaBop - Online marketplace</span></h1>
        <p style={{fontSize:"1rem",color:"rgba(255,255,255,0.85)",margin:"8px 0 0"}}>O'zbekistonda mahsulot sotib olish va uyga yetkazib berish platformasi</p>
        <p>
          HammaBop — O'zbekistonda foydalanuvchilarga onlayn tarzda mahsulot sotib olish,
          buyurtma berish va uyga yetkazib olish imkoniyatini taqdim etuvchi marketplace ilovasi.
          Google hisobi orqali tez va xavfsiz kiring.
        </p>
        <a className="hero-cta" href="https://aigate.uz/">Xarid qilishni boshlash →</a>
        <a className="hero-cta-sec" href="/privacy">Maxfiylik siyosati</a>
      </div>

      <section>
        <h2>HammaBop ilovasi haqida</h2>
        <p className="lead">
          HammaBop — O'zbekiston foydalanuvchilari uchun mo'ljallangan onlayn savdo platformasi.
          Ilova Google OAuth 2.0 orqali autentifikatsiyani qo'llab-quvvatlaydi — parol o'ylab
          topmasdan Google hisobi bilan tez kirish imkonini beradi.
        </p>
        <div className="oauth-box">
          <h3>🔑 Google OAuth orqali kirish — nima uchun?</h3>
          <ul>
            <li>Foydalanuvchi Google hisob ma'lumotlari (ism, elektron pochta) bilan tez ro'yxatdan o'tadi</li>
            <li>Parol eslab qolish shart emas — xavfsiz va qulay</li>
            <li>Biz foydalanuvchi parolini ko'rmaymiz yoki saqlamaymiz</li>
            <li>So'raladigan ma'lumotlar: <strong>elektron pochta manzili</strong> va <strong>ism</strong> — faqat profil yaratish uchun</li>
            <li>Ma'lumotlar uchinchi shaxslarga sotilmaydi yoki uzatilmaydi</li>
          </ul>
        </div>
      </section>

      <hr className="divider" />

      <section>
        <h2>Ilova imkoniyatlari</h2>
        <p className="lead">HammaBop foydalanuvchilarga quyidagi xizmatlarni taqdim etadi:</p>
        <div className="features">
          {[
            ["🛒", "Onlayn Xarid", "Minglab mahsulotlar — elektronika, kiyim-kechak, uy jihozlari, sport va ko'proq kategoriyalar."],
            ["🚚", "Tez Yetkazib Berish", "Kuryer orqali uyga yetkazib berish yoki yaqin nuqtadan o'z-o'zidan olib ketish."],
            ["💰", "Cashback 2%", "Har muvaffaqiyatli buyurtmadan 2% cashback. Keyingi xaridda ishlatiladi."],
            ["🔒", "Xavfsiz To'lov", "Click, Payme va naqd pul orqali to'lov. Barcha tranzaksiyalar shifrlangan."],
            ["📱", "Telegram Bildirishnomalar", "Buyurtma holati o'zgarganda Telegram bot orqali real vaqtda xabar."],
            ["🎁", "Referal Dasturi", "Do'stingizni HammaBop ga taklif qiling va 10 000 so'm bonus oling."],
          ].map(([icon, title, desc]) => (
            <div key={title} className="feature-card">
              <div className="feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      <section>
        <h2>Qanday ishlaydi?</h2>
        <p className="lead">HammaBop dan foydalanish juda oddiy — 4 ta qadam:</p>
        <div className="steps">
          {[
            ["Ro'yxatdan o'ting", "Google hisobi yoki telefon raqami orqali tez va xavfsiz ro'yxatdan o'ting."],
            ["Mahsulot tanlang", "Minglab mahsulotlar orasidan qidiring, kategoriyalar bo'yicha ko'rib chiqing."],
            ["Buyurtma bering", "Manzilni kiriting, qulay to'lov usulini tanlang va buyurtmani rasmiylashtiring."],
            ["Qabul qiling va cashback oling", "Kuryer yetkazib beradi yoki topshirish nuqtasidan olasiz. 2% cashback avtomatik hisoblanadi."],
          ].map(([title, desc], i) => (
            <div key={title} className="step">
              <div className="step-num">{i + 1}</div>
              <div className="step-body">
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="cta-band">
        <h2>Hoziroq boshlang</h2>
        <p>O'zbekistondagi eng qulay onlayn marketplace — HammaBop</p>
        <a href="https://aigate.uz/">Ilovani ochish →</a>
      </div>

      <footer>
        <div className="footer-links">
          <a href="https://aigate.uz/">Bosh sahifa</a>
          <a href="/privacy">Maxfiylik Siyosati</a>
          <a href="/terms">Foydalanish Shartlari</a>
          <a href="mailto:support@aigate.uz">support@aigate.uz</a>
        </div>
        <p>© 2026 HammaBop - Online marketplace | aigate.uz — O'zbekistonning Onlayn Bozori</p>
        <p style={{ marginTop: "6px", fontSize: "0.75rem" }}>
          Bu ilova Google OAuth 2.0 dan foydalanadi. Foydalanuvchi ma'lumotlari{" "}
          <a href="/privacy">maxfiylik siyosatimiz</a> asosida himoyalanadi.
        </p>
      </footer>
    </div>
  );
}
