import { Coffee, Gamepad2, HelpCircle, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router";

function Button({ children, className = "", variant = "default", onClick }) {
  const baseStyle = "px-4 py-2 rounded-md font-semibold text-center";
  const variantStyles = {
    default: "bg-[#ecbb0c] text-black",
    ghost: "bg-transparent text-white",
  };
  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const NavBar = () => {
  const navigate = useNavigate();
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#00b2ed] text-white flex justify-around py-3 px-6 rounded-lg shadow-lg text-sm text-center">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="text-lg flex flex-col items-center"
      >
        <Gamepad2 className="w-8 h-8" />
        <span>Juegos</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => navigate("/cafeteria")}
        className="text-lg flex flex-col items-center"
      >
        <Coffee className="w-8 h-8" />
        <span>Cafetería</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => navigate("/talleres")}
        className="text-lg flex flex-col items-center"
      >
        <Lightbulb className="w-8 h-8" />
        <span>Talleres</span>
      </Button>
      <Button
        variant="ghost"
        onClick={() => navigate("/preguntas-frecuentes")}
        className="text-lg flex flex-col items-center"
      >
        <HelpCircle className="w-8 h-8" />
        <span>FAQs</span>
      </Button>
    </div>
  );
};

export default NavBar;
