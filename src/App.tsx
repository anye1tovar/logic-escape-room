import { Route, BrowserRouter as Router, Routes } from "react-router";
import CafeteriaMenu from "./components/cafeteria-menu/cafeteria-menu.component";
import FAQsPage from "./components/faqs/faqs-page.component";
import HomePage from "./components/home/home.component";
import NavBar from "./components/nav-bar/nav-bar.component";
import RubikWorkshop from "./components/workshops/pages/rubiks-cube.component";
import SignLanguageWorkshop from "./components/workshops/pages/sign-language.component";
import WorkshopsPage from "./components/workshops/workshops-page.component";
import logicLogo from "/logic_full_logo.png";

const waLink = "https://wa.me/573181278688";

function App() {
  return (
    <div className="bg-[#231f20] pb-[140px]">
      {/* Top Header */}
      <div className="w-full bg-[#00b2ed] text-center py-2 text-sm">
        Reserva a través de nuestro{" "}
        <a href={waLink} className="underline" target="_blank">
          WhatsApp
        </a>
      </div>

      {/* Header */}
      <div className="py-6">
        <img src={logicLogo} alt="Logic Escape Room" className="h-16 mx-auto" />
      </div>

      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cafeteria" element={<CafeteriaMenu />} />
          <Route path="/talleres" element={<WorkshopsPage />} />
          <Route
            path="/talleres/lengua-de-senas"
            element={<SignLanguageWorkshop />}
          />
          <Route path="/talleres/desafio-rubik" element={<RubikWorkshop />} />
          <Route path="/preguntas-frecuentes" element={<FAQsPage />} />
        </Routes>
        <NavBar />
      </Router>
    </div>
  );
}

export default App;
