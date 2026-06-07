import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionContextProvider, useSessionContext } from "@/components/session-context-provider";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { I18nProvider } from "@/hooks/useI18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Component, lazy, Suspense, useEffect, useRef } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { BoxLoader } from "@/components/BoxLoader";
import { HeartLoader } from "@/components/HeartLoader";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { useAndroidBackButton } from "@/hooks/useAndroid";
import { SplashScreen } from "@capacitor/splash-screen";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4 p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Xato yuz berdi</h2>
          <p className="text-gray-500">Sahifani yangilang yoki keyinroq urinib ko'ring.</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            onClick={() => window.location.reload()}
          >
            Yangilash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Admin = lazy(() => import("./pages/Admin"));
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const CartPage = lazy(() => import("./pages/CartPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const TrackPage = lazy(() => import("./pages/TrackPage"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const PickupPointsPage = lazy(() => import("./pages/PickupPointsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error: unknown) => {
        // Network xatolarida qayta urinish, auth xatolarida emas
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const PageLoader = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white gap-4">
    <HeartLoader size="xl" label="Yuklanmoqda..." />
  </div>
);

function SwipeBack() {
  const navigate = useNavigate();
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = startX.current - e.changedTouches[0].clientX;
      const dy = Math.abs(startY.current - e.changedTouches[0].clientY);
      if (dx > 80 && dy < dx * 0.6) navigate(-1);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [navigate]);

  return null;
}

function AppRoutes() {
  const { loading, user } = useSessionContext();
  const navigate = useNavigate();
  useActivityTracker(user?.id);
  useAndroidBackButton();

  useEffect(() => {
    SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
  }, []);

  /* Check onboarding after auth loads */
  useEffect(() => {
    if (loading || !user) return;
    const key = `ob_done_${user.id}`;
    if (localStorage.getItem(key)) return;
    // Skip onboarding check if already on those pages
    const path = window.location.pathname;
    if (path === "/onboarding" || path === "/login") return;

    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("users").select("phone,full_name").eq("id", user.id).single()
        .then(({ data }) => {
          if (!data?.phone || !data?.full_name) {
            navigate("/onboarding", { replace: true });
          } else {
            localStorage.setItem(key, "1");
          }
        });
    });
  }, [user, loading]);

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/pickup-points" element={<PickupPointsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionContextProvider>
          <SiteSettingsProvider>
          <I18nProvider>
          <CurrencyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SwipeBack />
            <AppRoutes />
          </BrowserRouter>
          </CurrencyProvider>
          </I18nProvider>
          </SiteSettingsProvider>
        </SessionContextProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

