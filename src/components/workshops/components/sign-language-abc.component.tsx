import { useState } from "react";

const alphabet = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

export default function SignLanguageABC() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % alphabet.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + alphabet.length) % alphabet.length
    );
  };

  const handleSelectLetter = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="flex flex-col items-center bg-[#231f20] text-white p-6">
      <h1 className="text-2xl font-bold text-[white] mb-4 text-center">
        Abecedario en Lengua de Señas
      </h1>

      {/* Botones del abecedario */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {alphabet.map((letter, index) => (
          <button
            key={letter}
            onClick={() => handleSelectLetter(index)}
            className={`px-2 py-1 text-lg font-semibold rounded-lg transition ${
              index === currentIndex
                ? "bg-[#00b2ed] text-black"
                : "bg-white text-black"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Slider de imágenes */}
      <div className="relative w-64 h-64 bg-white flex items-center justify-center rounded-lg shadow-lg">
        <button
          className="absolute left-2 text-black text-2xl"
          onClick={handlePrev}
        >
          ❮
        </button>
        <img
          src={`/sign-abc/${alphabet[currentIndex]}_.png`}
          alt={`Seña de ${alphabet[currentIndex]}`}
          className="w-56 h-56 object-contain"
        />
        <button
          className="absolute right-2 text-black text-2xl"
          onClick={handleNext}
        >
          ❯
        </button>
      </div>
    </div>
  );
}
