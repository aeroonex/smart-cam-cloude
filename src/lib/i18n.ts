export type Lang = "uz" | "ru";

/* Tarjima lug'ati — kalit: { uz, ru } */
export const dict = {
  // ── Header / nav ──
  search_placeholder: { uz: "Mahsulot qidiring...", ru: "Поиск товаров..." },
  search_btn: { uz: "Qidirish", ru: "Найти" },
  catalog: { uz: "Katalog", ru: "Каталог" },
  orders: { uz: "Buyurtmalar", ru: "Заказы" },
  cart: { uz: "Savat", ru: "Корзина" },
  login: { uz: "Kirish", ru: "Войти" },
  profile: { uz: "Profil", ru: "Профиль" },
  my_orders: { uz: "Buyurtmalarim", ru: "Мои заказы" },
  edit_profile: { uz: "Profilni tahrirlash", ru: "Редактировать профиль" },
  admin_panel: { uz: "Admin panel", ru: "Админ-панель" },
  logout: { uz: "Chiqish", ru: "Выйти" },
  logged_out: { uz: "Hisobdan chiqildi.", ru: "Вы вышли из аккаунта." },

  // ── Sub-nav ──
  big_sale: { uz: "Buyuk sotuv", ru: "Большая распродажа" },
  hot: { uz: "Yonayotgan", ru: "Горящие" },
  top: { uz: "TOP", ru: "ТОП" },

  // ── Chips ──
  discounted: { uz: "Arzonlashtirilgan savdo", ru: "Товары со скидкой" },
  recommended: { uz: "Tavsiya qilamiz", ru: "Рекомендуем" },
  top_products: { uz: "Top tovarlar", ru: "Топ товары" },

  // ── Product card ──
  bought: { uz: "ta xarid", ru: "покупок" },
  free_delivery_14: { uz: "14 kun ichida, bepul", ru: "за 14 дней, бесплатно" },
  add_to_cart: { uz: "Savatga", ru: "В корзину" },
  added_to_cart: { uz: "Savatga qo'shildi!", ru: "Добавлено в корзину!" },
  added_to_wishlist: { uz: "Sevimlilariga qo'shildi", ru: "Добавлено в избранное" },
  removed_from_wishlist: { uz: "Sevimlilardan olib tashlandi", ru: "Удалено из избранного" },

  // ── Home sections ──
  not_found_product: { uz: "Mahsulot topilmadi", ru: "Товары не найдены" },
  view_all_products: { uz: "Barcha mahsulotlarni ko'rish", ru: "Показать все товары" },
  results_for: { uz: "bo'yicha", ru: "по запросу" },
  results_count: { uz: "ta natija", ru: "результатов" },
  clear: { uz: "Tozalash", ru: "Очистить" },

  // ── Orders section ──
  continue_shopping: { uz: "Xarid davom ettirish", ru: "Продолжить покупки" },
  connect_telegram: { uz: "Telegram ulash", ru: "Подключить Telegram" },

  // ── Cart ──
  cart_empty_title: { uz: "Savatda hech narsa yo'q", ru: "В корзине пусто" },
  cart_empty_text: {
    uz: "Tovar mahsulotlarni tanlang yoki savatga mahsulot qo'shgan bo'lsangiz, tizimga kiring",
    ru: "Выберите товары или войдите в аккаунт, если уже добавляли товары в корзину",
  },
  login_account: { uz: "Akkauntga kirish", ru: "Войти в аккаунт" },
  to_home: { uz: "Bosh sahifaga", ru: "На главную" },
  for_you: { uz: "Sizga atab ajratib qo'yilgan", ru: "Подобрано для вас" },
  total_sum: { uz: "Jami summa", ru: "Итого" },
  place_order: { uz: "Buyurtma berish", ru: "Оформить заказ" },
  remove: { uz: "O'chirish", ru: "Удалить" },

  // ── Footer ──
  footer_about: {
    uz: "O'zbekistondagi eng qulay online bozor. Tez yetkazib berish va kafolat bilan.",
    ru: "Самый удобный онлайн-маркет в Узбекистане. Быстрая доставка и гарантия.",
  },
  for_buyers: { uz: "Xaridorlar uchun", ru: "Покупателям" },
  help: { uz: "Yordam", ru: "Помощь" },
  home: { uz: "Bosh sahifa", ru: "Главная" },
  my_cart: { uz: "Savatim", ru: "Моя корзина" },
  social: { uz: "Ijtimoiy tarmoqlar", ru: "Соцсети" },
  rights_reserved: { uz: "Barcha huquqlar himoyalangan.", ru: "Все права защищены." },

  // ── Search page ──
  all_products: { uz: "Barcha mahsulotlar", ru: "Все товары" },
  recommend_title: { uz: "Tavsiya etamiz", ru: "Рекомендуем" },
  found_count_a: { uz: "ta mahsulot topildi", ru: "товаров найдено" },
  searching: { uz: "Qidirilmoqda...", ru: "Идёт поиск..." },
  filters: { uz: "Filtrlar", ru: "Фильтры" },
  categories: { uz: "Kategoriyalar", ru: "Категории" },
  price_sum: { uz: "Narx", ru: "Цена" },
  apply: { uz: "Qo'llash", ru: "Применить" },
  rating: { uz: "Reyting", ru: "Рейтинг" },
  delivery: { uz: "Yetkazish", ru: "Доставка" },
  free_delivery: { uz: "Bepul yetkazish", ru: "Бесплатная доставка" },
  clear_filters: { uz: "Filtrlarni tozalash", ru: "Сбросить фильтры" },
  no_result: { uz: "Natija topilmadi", ru: "Ничего не найдено" },
  back_home: { uz: "Bosh sahifaga qaytish", ru: "Вернуться на главную" },
  sort_relevant: { uz: "Eng mos kelgani", ru: "По релевантности" },
  sort_price_asc: { uz: "Narx: arzondan", ru: "Цена: по возрастанию" },
  sort_price_desc: { uz: "Narx: qimmatdan", ru: "Цена: по убыванию" },
  sort_sold: { uz: "Eng ko'p sotilgan", ru: "Самые продаваемые" },

  // ── Auth (login / register) ──
  back_to_home: { uz: "Bosh sahifaga qaytish", ru: "Вернуться на главную" },
  auth_login_title: { uz: "Hisobingizga kiring", ru: "Войдите в аккаунт" },
  auth_register_title: { uz: "Ro'yxatdan o'ting", ru: "Регистрация" },
  auth_login_sub: { uz: "Email va parolingizni kiriting.", ru: "Введите email и пароль." },
  auth_register_sub: { uz: "Bir necha qadamda hisob yarating.", ru: "Создайте аккаунт за пару шагов." },
  auth_have_account: { uz: "Hisobingiz bormi?", ru: "Уже есть аккаунт?" },
  auth_no_account: { uz: "Hisobingiz yo'qmi?", ru: "Нет аккаунта?" },
  first_name: { uz: "Ism", ru: "Имя" },
  last_name: { uz: "Familiya", ru: "Фамилия" },
  age: { uz: "Yosh", ru: "Возраст" },
  phone: { uz: "Telefon raqami", ru: "Номер телефона" },
  email: { uz: "Email", ru: "Email" },
  email_confirm: { uz: "Emailni tasdiqlang", ru: "Подтвердите email" },
  password: { uz: "Parol", ru: "Пароль" },
  password_confirm: { uz: "Parolni tasdiqlang", ru: "Подтвердите пароль" },
  sign_in: { uz: "Kirish", ru: "Войти" },
  sign_up: { uz: "Ro'yxatdan o'tish", ru: "Зарегистрироваться" },
  close: { uz: "Yopish", ru: "Закрыть" },
  err_fill_all: { uz: "Barcha maydonlarni to'ldiring.", ru: "Заполните все поля." },
  err_email_mismatch: { uz: "Email manzillar mos kelmadi.", ru: "Email-адреса не совпадают." },
  err_password_mismatch: { uz: "Parollar mos kelmadi.", ru: "Пароли не совпадают." },
  err_password_short: { uz: "Parol kamida 6 ta belgidan iborat bo'lsin.", ru: "Пароль должен содержать минимум 6 символов." },
  err_age_invalid: { uz: "To'g'ri yoshni kiriting.", ru: "Введите корректный возраст." },
  // Pop-up
  welcome_popup_title: { uz: "Tabriklaymiz! 🎉", ru: "Поздравляем! 🎉" },
  welcome_popup_text: {
    uz: "Hisobingiz yaratildi! Quyidagi login va parolni saqlab qo'ying — ularni yo'qotmang!",
    ru: "Аккаунт создан! Сохраните логин и пароль ниже — не потеряйте их!",
  },
  your_login: { uz: "Sizning login", ru: "Ваш логин" },
  your_password: { uz: "Sizning parol", ru: "Ваш пароль" },
  popup_ok: { uz: "Tushunarli, saqladim!", ru: "Понятно, сохранил!" },
  feature_secure: { uz: "Himoyalangan", ru: "Защищено" },
  feature_secure_t: { uz: "Xavfsiz autentifikatsiya", ru: "Безопасная аутентификация" },
  feature_fast: { uz: "Tez buyurtma", ru: "Быстрый заказ" },
  feature_fast_t: { uz: "Bir necha bosqichda rasmiylashtirish", ru: "Оформление в пару шагов" },
  feature_trust: { uz: "Ishonchli", ru: "Надёжно" },
  feature_trust_t: { uz: "Buyurtma tarixini kuzating", ru: "Отслеживайте историю заказов" },
} as const;

export type TKey = keyof typeof dict;
