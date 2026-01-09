import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Qr from "./pages/Qr/Qr";
import NotFound from "./pages/NotFound/NotFound";
import AdminLogin from "./pages/AdminLogin/AdminLogin";
import AdminLayout from "./pages/Admin/AdminLayout/AdminLayout";
import AdminRates from "./pages/Admin/Rates/AdminRates";
import AdminHolidays from "./pages/Admin/Holidays/AdminHolidays";
import AdminOpeningHours from "./pages/Admin/OpeningHours/AdminOpeningHours";
import AdminRooms from "./pages/Admin/Rooms/AdminRooms";
import AdminSettings from "./pages/Admin/Settings/AdminSettings";
import AdminReservations from "./pages/Admin/Reservations/AdminReservations";
import AdminCafeteriaProducts from "./pages/Admin/CafeteriaProducts/AdminCafeteriaProducts";
import AdminUsers from "./pages/Admin/Users/AdminUsers";
import theme from "./theme";

const jugadoresImg = "/landing/jugadores.png";
const notasImg = "/landing/notas.png";
const wallmapImg = "/landing/wallmap.png";

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
          <Route path="/qr" element={<Qr />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/consulta-reserva" element={<BookingStatus />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminLayout />}>
            <Route index element={<AdminReservations />} />
            <Route path="reservas" element={<AdminReservations />} />
            <Route path="precios" element={<AdminRates />} />
            <Route path="cafeteria" element={<AdminCafeteriaProducts />} />
            <Route path="festivos" element={<AdminHolidays />} />
            <Route path="horarios" element={<AdminOpeningHours />} />
            <Route path="salas" element={<AdminRooms />} />
            <Route path="configuraciones" element={<AdminSettings />} />
            <Route path="usuarios" element={<AdminUsers />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
