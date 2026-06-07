package uz.hammabop.app

import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge — content statusbar va navigation bar ostiga kiradi
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Status bar ikonlari oq (bizning naranja fon ustida yaxshi ko'rinadi)
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = false
        insetsController.isAppearanceLightNavigationBars = false

        // Status bar va navigation bar shaffof
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT

        // Hardware acceleration — animatsiyalar silliq bo'ladi
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )

        // WebView optimizatsiyalari
        bridge.webView.apply {
            // Overscroll (yashil glow effekt) — o'chirish
            overScrollMode = View.OVER_SCROLL_NEVER

            // Scrollbar — ko'rsatmaslik (native app kabi)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false

            // Silliq scroll
            isScrollbarFadingEnabled = true

            settings.apply {
                // JavaScript albatta kerak
                javaScriptEnabled = true

                // DOM Storage (localStorage)
                domStorageEnabled = true

                // Kesh — offline ishlash uchun
                cacheMode = WebSettings.LOAD_DEFAULT

                // Rasm optimizatsiyasi
                loadsImagesAutomatically = true

                // Viewport
                useWideViewPort = true
                loadWithOverviewMode = true

                // Matn o'lchamini foydalanuvchi o'zgartira olmasin
                textZoom = 100

                // Media autoplay (video uchun)
                mediaPlaybackRequiresUserGesture = false

                // Mixed content (HTTP + HTTPS)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }

                // Rendering uchun GPU acceleration
                setRenderPriority(WebSettings.RenderPriority.HIGH)
            }

            // Long-press kontekst menyusini o'chirish (native app kabi)
            setOnLongClickListener { true }
            isLongClickable = false
        }
    }
}
