import TopHeader from "./components/layout/TopHeader";
import Header from "./components/layout/Header";
import Hero from "./components/landing/Hero";
import About from "./components/landing/About/About";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Booking from "./pages/Booking/Booking";
import { BookingModalProvider } from "./contexts/BookingModalContext";
import BookingModal from "./components/BookingModal/BookingModal";
import BookingConfirm from "./pages/Booking/BookingConfirm";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

function HomeContent() {
  const { t } = useTranslation();

  return (
    <div>
      <TopHeader />
      <Header />
      <Hero />
      <main>
        <About />
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
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
    </ThemeProvider>
  );
}

export default App;
