import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./AdminLayout.scss";

const navItems = [
  { to: "/admin/dashboard/precios", label: "Precios" },
  { to: "/admin/dashboard/festivos", label: "Festivos" },
  { to: "/admin/dashboard/horarios", label: "Horarios de apertura" },
  { to: "/admin/dashboard/salas", label: "Salas" },
  { to: "/admin/dashboard/configuraciones", label: "Configuraciones" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) navigate("/admin", { replace: true });
  }, [navigate]);

  return (
    <div className="admin-layout">
      <aside className="admin-layout__sidebar" aria-label="Admin navigation">
        <div className="admin-layout__brand">Logic Admin</div>
        <nav className="admin-layout__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                ["admin-layout__link", isActive ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="admin-layout__logout"
          onClick={() => {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            navigate("/admin", { replace: true });
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <section className="admin-layout__content">
        <Outlet />
      </section>
    </div>
  );
}

