import { useState } from "react";

export default function CafeteriaNavigation({ categories, onSelectCategory }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Menú lateral en desktop */}
      <nav className="hidden sm:flex flex-col bg-[gray] p-4 w-1/5 h-screen text-lg font-semibold sticky top-0 overflow-y-auto">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className="mb-2 text-white hover:underline border-b border-white pb-2"
          >
            {category}
          </button>
        ))}
      </nav>

      {/* Menú hamburguesa en mobile */}
      <div className="sm:hidden fixed top-[148px] left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white bg-[gray] pt-2 pb-2 pl-3 pr-3 rounded-md"
        >
          ☰
        </button>
      </div>

      {isOpen && (
        <div className="sm:hidden fixed top-0 left-0 w-3/4 h-full bg-[gray] text-white p-6 shadow-lg z-50">
          <button
            onClick={() => setIsOpen(false)}
            className="text-white absolute top-4 right-4 text-xl"
          >
            ✖
          </button>
          <nav className="flex flex-col space-y-4 mt-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  onSelectCategory(category);
                  setIsOpen(false);
                }}
                className="text-white text-lg hover:underline"
              >
                {category}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
