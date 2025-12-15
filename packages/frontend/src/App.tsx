import TopHeader from "./components/layout/TopHeader";
import Header from "./components/layout/Header";
import Hero from "./components/landing/Hero";
import { useTranslation } from "react-i18next";

function App() {
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

export default App;
