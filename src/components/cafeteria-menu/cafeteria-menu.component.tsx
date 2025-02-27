import {
  CakeSlice,
  Coffee,
  CupSoda,
  Dessert,
  Martini,
  Sandwich,
} from "lucide-react";
import { useState } from "react";
import menuItems from "../../data/menu";
import CafeteriaNavigation from "./cefeteria-navigation.component";

const categoryIcons = {
  "Bebidas calientes": <Coffee className="w-12 h-12 sm:w-8 sm:h-8" />,
  "Bebidas frías": <CupSoda className="w-12 h-12 sm:w-8 sm:h-8" />,
  "Cocteles sin alcohol": <Martini className="w-12 h-12 sm:w-8 sm:h-8" />,
  "Comida de sal": <Sandwich className="w-12 h-12 sm:w-8 sm:h-8" />,
  Postres: <Dessert className="w-12 h-12 sm:w-8 sm:h-8" />,
  Repostería: <CakeSlice className="w-12 h-12 sm:w-8 sm:h-8" />,
};

export function formatPrice(price) {
  if (typeof price !== "number") return "Precio no disponible";
  return `$${price.toLocaleString("es-CO")} `;
}

export default function CafeteriaMenu() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const categories = [...new Set(menuItems.map((item) => item.category))];

  return (
    <>
      <h1 className="text-3xl font-bold text-[#ecbb0c] mb-6 text-center">
        Carta de la Cafetería
      </h1>
      <div className="bg-[#231f20] text-white min-h-screen flex flex-row">
        {/* Navegación lateral en desktop y menú hamburguesa en mobile */}
        <CafeteriaNavigation
          categories={categories}
          onSelectCategory={setSelectedCategory}
        />
        {/* Contenido */}
        <div className="flex-1 pl-6 pr-6">
          {categories.map((category) => {
            const categoryItems = menuItems.filter(
              (item) => item.category === category
            );
            if (selectedCategory && selectedCategory !== category) return null;
            return (
              <div key={category} className="mb-8">
                {/* Icono y nombre de categoría */}
                <div className="flex items-center mb-4">
                  {categoryIcons[category]}
                  <h2 className="text-2xl font-bold ml-4">{category}</h2>
                </div>
                {/* Lista de productos en tabla sin bordes */}
                <div className="bg-white text-black p-4 rounded-lg shadow-lg">
                  <table className="w-full text-left">
                    <tbody>
                      {categoryItems.map((item) => (
                        <tr
                          key={item.name}
                          className="border-b border-gray-200 last:border-none"
                        >
                          <td className="py-2 font-medium">{item.name}</td>
                          <td className="py-2 text-right">
                            {item.available
                              ? `${formatPrice(item.price)}`
                              : "No disponible"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
