import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import BookingModal from "./components/BookingModal/BookingModal";
import AnnouncementBar from "./components/common/AnnouncementBar/AnnouncementBar";
import About from "./components/landing/About/About";
import Guidelines from "./components/landing/Guidelines";
import Hero from "./components/landing/Hero";
import Pricing from "./components/landing/Pricing";
import Rooms from "./components/landing/Rooms";
import Header from "./components/layout/Header";
import { BookingModalProvider } from "./contexts/BookingModalContext";
import Booking from "./pages/Booking/Booking";
import BookingConfirm from "./pages/Booking/BookingConfirm";
import theme from "./theme";

function HomeContent() {
  const { t } = useTranslation();

  return (
    <div>
      <Header />
      <Hero />
      <AnnouncementBar text={t("topHeader.announcement")} />
      <main>
        <About />
        <Rooms />
        <Guidelines />
        <AnnouncementBar text={t("topHeader.announcement")} />
        <Pricing />
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
