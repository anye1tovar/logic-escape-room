import { lazy, Suspense } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AnnouncementBar from "./components/common/AnnouncementBar/AnnouncementBar";
import Hero from "./components/landing/Hero";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import theme from "./theme";

const PinZoomOverlay = lazy(
  () => import("./components/PinnedZoomOverlay/PinnedZoomOverlay")
);
const About = lazy(() => import("./components/landing/About/About"));
const Guidelines = lazy(() => import("./components/landing/Guidelines"));
const Location = lazy(() => import("./components/landing/Location"));
const Opinions = lazy(() => import("./components/landing/Opinions"));
const Pricing = lazy(() => import("./components/landing/Pricing"));
const Rooms = lazy(() => import("./components/landing/Rooms"));

const Booking = lazy(() => import("./pages/Booking/Booking"));
const BookingStatus = lazy(() => import("./pages/BookingStatus/BookingStatus"));
const CafeteriaMenu = lazy(() => import("./pages/CafeteriaMenu/CafeteriaMenu"));
const Qr = lazy(() => import("./pages/Qr/Qr"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/Admin/AdminLayout/AdminLayout"));
const AdminRates = lazy(() => import("./pages/Admin/Rates/AdminRates"));
const AdminHolidays = lazy(() => import("./pages/Admin/Holidays/AdminHolidays"));
const AdminOpeningHours = lazy(
  () => import("./pages/Admin/OpeningHours/AdminOpeningHours")
);
const AdminRooms = lazy(() => import("./pages/Admin/Rooms/AdminRooms"));
const AdminSettings = lazy(() => import("./pages/Admin/Settings/AdminSettings"));
const AdminReservations = lazy(
  () => import("./pages/Admin/Reservations/AdminReservations")
);
const AdminCafeteriaProducts = lazy(
  () => import("./pages/Admin/CafeteriaProducts/AdminCafeteriaProducts")
);
const AdminUsers = lazy(() => import("./pages/Admin/Users/AdminUsers"));

const jugadoresImg = "/landing/jugadores.webp";
const notasImg = "/landing/notas.webp";
const wallmapImg = "/landing/wallmap.webp";

const PageFallback = () => (
  <div className="app-loading" role="status" aria-live="polite">
    Cargando...
  </div>
);

const SectionFallback = () => (
  <div className="section-loading" role="status" aria-live="polite">
    Cargando...
  </div>
);

function HomeContent() {
  const { t } = useTranslation();

  return (
    <div>
      <Header />
      <Hero />
      <AnnouncementBar text={t("topHeader.announcement")} />
      <main>
        <Suspense fallback={<SectionFallback />}>
          <PinZoomOverlay imageUrl={wallmapImg} overlay={<About />} />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Rooms />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Guidelines />
        </Suspense>
        <AnnouncementBar text={t("topHeader.announcement")} />
        <Suspense fallback={<SectionFallback />}>
          <PinZoomOverlay imageUrl={jugadoresImg} overlay={<Pricing />} />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Opinions />
        </Suspense>
        <AnnouncementBar text={t("topHeader.announcement")} />
        <Suspense fallback={<SectionFallback />}>
          <PinZoomOverlay imageUrl={notasImg} overlay={<Location />} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
