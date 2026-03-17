import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DataPage from "./pages/DataPage";
import SettingsPage from "./pages/SettingsPage";
import EvolutionPage from "./pages/EvolutionPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <DataProvider>
          <Toaster />
          <Sonner />
          <MainLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/evolution" element={<EvolutionPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </DataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
