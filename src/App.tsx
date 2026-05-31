import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionContextProvider } from "@/components/session-context-provider";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { I18nProvider } from "@/hooks/useI18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";
import SearchResults from "./pages/SearchResults";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SessionContextProvider>
        <I18nProvider>
        <CurrencyProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </CurrencyProvider>
        </I18nProvider>
      </SessionContextProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
