import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionContextProvider, useSessionContext } from "@/components/session-context-provider";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { I18nProvider } from "@/hooks/useI18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const Admin = lazy(() => import("./pages/Admin"));
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SearchResults = lazy(() => import("./pages/SearchResults"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EE7526] border-t-transparent" />
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
  useActivityTracker(user?.id);

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SessionContextProvider>
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
      </SessionContextProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
