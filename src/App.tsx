import { useState } from "react";
import QrCodeModal from "./components/qr-core-modal.component";
import SocialMediaView from "./components/social-media-view.componen";
import logicLogo from "/logo-logic.png";
import HomePage from "./components/home/home.component";

function App() {
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const pageUrl = window.location.href;

  return (
    // <div className="min-h-screen flex flex-col items-center bg-gray-100 text-center">
    //   <header className="py-10">
    //     <img
    //       src={logicLogo}
    //       alt="Logic Escape Room Logo"
    //       className="w-24 h-24 mx-auto mb-4"
    //     />
    //     <h1 className="text-2xl font-bold">LOGIC ESCAPE ROOM TUNJA</h1>
    //   </header>
    //   <SocialMediaView />
    //   <footer className="w-full py-6 flex justify-center">
    //     <button
    //       onClick={() => setQrModalOpen(true)}
    //       className="text-blue-500 hover:underline"
    //     >
    //       Generar QR de esta página
    //     </button>
    //   </footer>

    //   <QrCodeModal
    //     url={pageUrl}
    //     isOpen={isQrModalOpen}
    //     onClose={() => setQrModalOpen(false)}
    //   />
    // </div>
    <HomePage/>
  );
}

export default App;
