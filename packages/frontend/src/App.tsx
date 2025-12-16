import TopHeader from "./components/layout/TopHeader";
import Header from "./components/layout/Header";
import Hero from "./components/landing/Hero";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Booking from "./pages/Booking/Booking";
import { BookingModalProvider } from "./contexts/BookingModalContext";
import BookingModal from "./components/BookingModal/BookingModal";
import BookingConfirm from "./pages/Booking/BookingConfirm";

function HomeContent() {
  const { t } = useTranslation();

  return (
    <div>
      <TopHeader />
      <Header />
      <Hero />
      <main style={{ minHeight: "100vh", padding: "2rem" }}>
        <div>
          <h2>{t("app.moreContent")}</h2>
          <p>{t("app.sectionsPlaceholder")}</p>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <BookingModalProvider>
        <Routes>
          <Route path="/" element={<HomeContent />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/confirm" element={<BookingConfirm />} />
        </Routes>
        <BookingModal />
      </BookingModalProvider>
    </BrowserRouter>
  );
}

export default App;
