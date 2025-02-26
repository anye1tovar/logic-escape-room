import { Coffee, Gamepad2, HelpCircle, Lightbulb } from "lucide-react";
import SocialMediaView from "../social-media-view.componen";
import canibalImg from "/canibal.png";
import logicLogo from "/logic_full_logo.png";
import portalImg from "/portal.png";

function Button({ children, className =  "", variant = "default", onClick  }) {
  const baseStyle = "px-4 py-2 rounded-md font-semibold text-center";
  const variantStyles = {
    default: "bg-[#ecbb0c] text-black",
    ghost: "bg-transparent text-white",
  };
  return <button className={`${baseStyle} ${variantStyles[variant]} ${className}`} onClick={onClick}>{children}</button>;
}

const waLink = "https://wa.me/573181278688";

export default function HomePage() {
  return (
    <div className="bg-[#231f20] text-white min-h-screen flex flex-col items-center pb-[160px]">
      {/* Top Header */}
      <div className="w-full bg-[#00b2ed] text-center py-2 text-sm">
        Reserva a través de nuestro <a href={waLink} className="underline" target="_blank">WhatsApp</a>
      </div>
      
      {/* Header */}
      <div className="py-6">
        <img src={logicLogo} alt="Logic Escape Room" className="h-16 mx-auto" />
      </div>
      
      {/* Body */}
      <div className="w-full max-w-3xl px-4">
        {/* Parte 1: Imágenes de juegos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="text-center">
            <img src={portalImg} alt="Portal" className="rounded-lg shadow-lg w-full" />
            <Button className="mt-4 w-full" onClick={() => window.open(waLink, '_blank', 'noopener')}>Reservar</Button>
          </div>
          <div className="text-center">
            <img src={canibalImg} alt="Canibal" className="rounded-lg shadow-lg w-full" />
            <Button className="mt-4 w-full" onClick={() => window.open(waLink, '_blank', 'noopener')}>Reservar</Button>
          </div>
        </div>
        
        {/* Parte 2: Horarios */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-[#ecbb0c]">Horarios</h2>
          <p className="text-lg">Martes a Viernes: 4:30PM - 9:30PM</p>
          <p className="text-lg">Sábados: 2:00AM - 9:00PM</p>
          <p className="text-lg">Domingos: Previa Reserva</p>
        </div>
        
        {/* Parte 3: Redes sociales y ubicación */}
        <SocialMediaView/> 
      </div>
      
      {/* Menú Flotante */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#00b2ed] text-white flex justify-around py-3 px-6 rounded-lg shadow-lg text-sm text-center">
        <Button variant="ghost" onClick={() => {}} className="text-lg flex flex-col items-center"><Gamepad2 className="w-8 h-8" /><span>Juegos</span></Button>
        <Button variant="ghost" onClick={() => {}} className="text-lg flex flex-col items-center"><Coffee className="w-8 h-8" /><span>Cafetería</span></Button>
        <Button variant="ghost" onClick={() => {}} className="text-lg flex flex-col items-center"><Lightbulb className="w-8 h-8" /><span>Talleres</span></Button>
        <Button variant="ghost" onClick={() => {}} className="text-lg flex flex-col items-center"><HelpCircle className="w-8 h-8" /><span>FAQs</span></Button>
      </div>
    </div>
  );
}
