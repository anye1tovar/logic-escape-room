import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import jugadoresImg from "./assets/landing/jugadores.png";
import notasImg from "./assets/landing/notas.png";
import wallmapImg from "./assets/landing/wallmap.png";
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
import Booking from "./pages/Booking/Booking";
import BookingStatus from "./pages/BookingStatus/BookingStatus";
import CafeteriaMenu from "./pages/CafeteriaMenu/CafeteriaMenu";
import AdminLogin from "./pages/AdminLogin/AdminLogin";
import AdminLayout from "./pages/Admin/AdminLayout/AdminLayout";
import AdminRates from "./pages/Admin/Rates/AdminRates";
import AdminHolidays from "./pages/Admin/Holidays/AdminHolidays";
import AdminOpeningHours from "./pages/Admin/OpeningHours/AdminOpeningHours";
import AdminRooms from "./pages/Admin/Rooms/AdminRooms";
import AdminSettings from "./pages/Admin/Settings/AdminSettings";
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
        <PinZoomOverlay imageUrl={notasImg} overlay={<Location />} />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeContent />} />
          <Route path="/cafeteria" element={<CafeteriaMenu />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/consulta-reserva" element={<BookingStatus />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminLayout />}>
            <Route index element={<AdminRates />} />
            <Route path="precios" element={<AdminRates />} />
            <Route path="festivos" element={<AdminHolidays />} />
            <Route path="horarios" element={<AdminOpeningHours />} />
            <Route path="salas" element={<AdminRooms />} />
            <Route path="configuraciones" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
