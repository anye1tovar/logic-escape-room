import { Link } from "react-router";

const workshops = [
  {
    id: "lengua-de-senas",
    name: "Taller básico de lengua de señas",
  },
  {
    id: "desafio-rubik",
    name: "Desafío Rubik: Domina tu primer Cubo",
  },
];

export default function WorkshopsPage() {
  return (
    <div className="bg-[#231f20] text-white min-h-screen p-6">
      <h1 className="text-3xl font-bold text-[#ecbb0c] mb-6 text-center">
        Talleres en Logic Escape Room
      </h1>
      <div className="max-w-3xl mx-auto">
        {workshops.map((workshop) => (
          <div
            key={workshop.id}
            className="mb-4 p-4 bg-white text-black rounded-lg shadow-lg hover:bg-gray-100 transition"
          >
            <Link
              to={`/talleres/${workshop.id}`}
              className="text-xl font-semibold hover:underline block"
            >
              {workshop.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
