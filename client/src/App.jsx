import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import IntelligenceSearch from "./pages/Search";
import DocumentView from "./pages/DocumentView";
import OcrPage from "./pages/OcrPage";
import AppLayout from "./components/layout/AppLayout";
import PublicLayout from "./components/layout/PublicLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Landing from "./pages/Landing";
import { OcrProvider } from "./context/OcrContext";
import ChatPanel from "./components/dashboard/ChatPanel";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicLayout>
              <Login />
            </PublicLayout>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicLayout>
              <Signup />
            </PublicLayout>
          }
        />

        {/* PROTECTED */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <OcrProvider>
                <AppLayout />
              </OcrProvider>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<IntelligenceSearch />} />
          <Route path="document/:id" element={<DocumentView />} />
          <Route path="ocr" element={<OcrPage />} />
          <Route path="chatbot" element={<ChatPanel/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
