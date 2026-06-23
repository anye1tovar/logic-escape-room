import { lazy, Suspense, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import AnnouncementBar from "./components/common/AnnouncementBar/AnnouncementBar";
import CookieConsentBanner from "./components/common/CookieConsentBanner";
import FloatingWhatsAppButton from "./components/common/FloatingWhatsAppButton";
import Hero from "./components/landing/Hero";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import {
  generateMetaEventId,
  initMetaPixel,
  trackMetaEvent,
  trackServerMetaEvent,
} from "./lib/metaPixel";
import theme from "./theme";
const Guidelines = lazy(() => import("./components/landing/Guidelines"));
const Location = lazy(() => import("./components/landing/Location"));
const Opinions = lazy(() => import("./components/landing/Opinions"));
const Pricing = lazy(() => import("./components/landing/Pricing"));
const Rooms = lazy(() => import("./components/landing/Rooms"));

const AboutPage = lazy(() => import("./pages/About/AboutPage"));
const Booking = lazy(() => import("./pages/Booking/Booking"));
const BookingStatus = lazy(() => import("./pages/BookingStatus/BookingStatus"));
const CafeteriaMenu = lazy(() => import("./pages/CafeteriaMenu/CafeteriaMenu"));
const RoomsDetail = lazy(() => import("./pages/RoomsDetail/RoomsDetail"));
const Qr = lazy(() => import("./pages/Qr/Qr"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/Admin/AdminLayout/AdminLayout"));
const AdminRates = lazy(() => import("./pages/Admin/Rates/AdminRates"));
const AdminHolidays = lazy(
  () => import("./pages/Admin/Holidays/AdminHolidays"),
);
const AdminOpeningHours = lazy(
  () => import("./pages/Admin/OpeningHours/AdminOpeningHours"),
);
const AdminRooms = lazy(() => import("./pages/Admin/Rooms/AdminRooms"));
const AdminSettings = lazy(
  () => import("./pages/Admin/Settings/AdminSettings"),
);
const AdminReservations = lazy(
  () => import("./pages/Admin/Reservations/AdminReservations"),
);
const AdminTiming = lazy(() => import("./pages/Admin/Timing/AdminTiming"));
const AdminCafeteriaProducts = lazy(
  () => import("./pages/Admin/CafeteriaProducts/AdminCafeteriaProducts"),
);
const AdminUsers = lazy(() => import("./pages/Admin/Users/AdminUsers"));

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

const HashScroll = () => {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const targetId = decodeURIComponent(hash.slice(1));
    let attempts = 0;
    const maxAttempts = 24;

    const scrollToTarget = () => {
      const target = document.getElementById(targetId);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(scrollToTarget, 100);
      }
    };

    window.setTimeout(scrollToTarget, 0);
  }, [hash, pathname]);

  return null;
};

function inferContactSource(anchor: HTMLAnchorElement) {
  const explicit = anchor.dataset.contactSource;
  if (explicit) return explicit;
  const className = anchor.className.toString();
  const pathname = window.location.pathname;

  if (className.includes("floating-whatsapp")) return "floating_whatsapp";
  if (pathname === "/reservar") return "booking";
  if (pathname === "/consulta-reserva") return "booking_status";
  if (pathname === "/cafeteria") return "cafeteria";
  if (className.includes("rooms")) return "rooms";
  return "whatsapp";
}

const MarketingTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = () => {
      if (location.pathname.startsWith("/admin")) return;
      initMetaPixel();

      const viewContentEventId = generateMetaEventId("view-content");
      const contentName =
        location.pathname === "/"
          ? "Home"
          : location.pathname.replace(/^\/+/, "") || "Home";
      const viewContentParams = {
        content_name: contentName,
        content_category: "site_page",
      };
      trackMetaEvent("ViewContent", viewContentParams, viewContentEventId);
      void trackServerMetaEvent(
        "ViewContent",
        viewContentParams,
        viewContentEventId,
      );
    };

    trackPageView();
    const onConsentChange = () => trackPageView();
    window.addEventListener("logic:marketing-consent-changed", onConsentChange);
    return () => {
      window.removeEventListener(
        "logic:marketing-consent-changed",
        onConsentChange,
      );
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.(
        "a[href*='wa.me']",
      ) as HTMLAnchorElement | null;
      if (!anchor || window.location.pathname.startsWith("/admin")) return;
      const eventId = generateMetaEventId("contact");
      const eventParams = {
        contact_source: inferContactSource(anchor),
        destination: "whatsapp",
      };
      trackMetaEvent("Contact", eventParams, eventId);
      void trackServerMetaEvent("Contact", eventParams, eventId);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
};

function HomeContent() {
  const { t } = useTranslation();

  return (
    <div>
      <Header />
      <Hero />
      <AnnouncementBar text={t("topHeader.announcement")} />
      <main>
        <Suspense fallback={<SectionFallback />}>
          <Rooms />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Pricing />
        </Suspense>
        <AnnouncementBar text={t("topHeader.announcement")} />
        <Suspense fallback={<SectionFallback />}>
          <Guidelines />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Opinions />
        </Suspense>
        <AnnouncementBar text={t("topHeader.announcement")} />
        <Suspense fallback={<SectionFallback />}>
          <Location />
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
        <HashScroll />
        <MarketingTracker />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomeContent />} />
            <Route path="/nosotros" element={<AboutPage />} />
            <Route path="/salas" element={<RoomsDetail />} />
            <Route path="/cafeteria" element={<CafeteriaMenu />} />
            <Route path="/qr" element={<Qr />} />
            <Route path="/reservar" element={<Booking />} />
            <Route path="/consulta-reserva" element={<BookingStatus />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminLayout />}>
              <Route index element={<AdminReservations />} />
              <Route path="reservas" element={<AdminReservations />} />
              <Route path="cronometraje" element={<AdminTiming />} />
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
        <FloatingWhatsAppButton />
        <CookieConsentBanner />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
