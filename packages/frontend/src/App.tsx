import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import wallmapImg from "./assets/landing/wallmap.png";
import jugadoresImg from "./assets/landing/jugadores.png";
import notasImg from "./assets/landing/notas.png";
import BookingModal from "./components/BookingModal/BookingModal";
import AnnouncementBar from "./components/common/AnnouncementBar/AnnouncementBar";
import About from "./components/landing/About/About";
import Guidelines from "./components/landing/Guidelines";
import Hero from "./components/landing/Hero";
import Location from "./components/landing/Location";
import Opinions from "./components/landing/Opinions";
import Pricing from "./components/landing/Pricing";
import Rooms from "./components/landing/Rooms";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import PinZoomOverlay from "./components/PinnedZoomOverlay/PinnedZoomOverlay";
import { BookingModalProvider } from "./contexts/BookingModalContext";
import Booking from "./pages/Booking/Booking";
import BookingConfirm from "./pages/Booking/BookingConfirm";
import CafeteriaMenu from "./pages/CafeteriaMenu/CafeteriaMenu";
import theme from "./theme";

function HomeContent() {
  const { t } = useTranslation();

  return (
    <div>
      <Header />
      <Hero />
      <AnnouncementBar text={t("topHeader.announcement")} />
      <main>
        <PinZoomOverlay imageUrl={wallmapImg} overlay={<About />} />
        <Rooms />
        <Guidelines />
        <AnnouncementBar text={t("topHeader.announcement")} />
        <PinZoomOverlay imageUrl={jugadoresImg} overlay={<Pricing />} />
        <Opinions />
        <AnnouncementBar text={t("topHeader.announcement")} />
        <PinZoomOverlay imageUrl={notasImg} overlay={<Pricing />} />
        <Location />
      </main>
      <Footer />
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
            <Route path="/cafeteria" element={<CafeteriaMenu />} />
          </Routes>
          <BookingModal />
        </BookingModalProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
