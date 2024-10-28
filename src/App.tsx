import SocialMediaView from "./components/social-media-view/social-media-view.componen";
import logicLogo from "/logo-logic.png";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 text-center">
      <header className="py-10">
        <img
          src={logicLogo}
          alt="Logic Escape Room Logo"
          className="w-24 h-24 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold">LOGIC ESCAPE ROOM TUNJA</h1>
      </header>
      <SocialMediaView />
    </div>
  );
}

export default App;
