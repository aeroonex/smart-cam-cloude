/* Firebase Web Push — fon (background) bildirishnomalar uchun service worker */
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC1wHgIA-6YFRdEnnjeysO2_U9aNlZ1Iyc",
  authDomain: "cdi-mock.firebaseapp.com",
  projectId: "cdi-mock",
  storageBucket: "cdi-mock.firebasestorage.app",
  messagingSenderId: "561532722771",
  appId: "1:561532722771:android:9d34b882e14502ab6070a6",
});

const messaging = firebase.messaging();

// Ilova yopiq/fon holatida kelgan push
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "HammaBop";
  const options = {
    body: payload.notification?.body || "",
    icon: "/smartcam-logo.png",
    badge: "/smartcam-logo.png",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Bildirishnoma bosilganda — kerakli sahifani ochish
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url); return c.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
