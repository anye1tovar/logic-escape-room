import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, IconButton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import "./AdminLayout.scss";

const navItems = [
  { to: "/admin/dashboard/reservas", label: "Reservas" },
  { to: "/admin/dashboard/precios", label: "Precios" },
  { to: "/admin/dashboard/cafeteria", label: "Cafeteria" },
  { to: "/admin/dashboard/festivos", label: "Festivos" },
  { to: "/admin/dashboard/horarios", label: "Horarios de apertura" },
  { to: "/admin/dashboard/salas", label: "Salas" },
  { to: "/admin/dashboard/configuraciones", label: "Configuraciones" },
];

function SidebarInner({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="admin-layout__brand">Logic Admin</div>
      <nav className="admin-layout__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
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

      <Button
        variant="outlined"
        color="inherit"
        className="admin-layout__logout"
        onClick={onLogout}
      >
        Cerrar sesión
      </Button>
    </>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) navigate("/admin", { replace: true });
  }, [navigate]);

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname, isMobile]);

  const onLogout = useMemo(() => {
    return () => {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      navigate("/admin", { replace: true });
    };
  }, [navigate]);

  return (
    <div className="admin-layout">
      {!isMobile ? (
        <aside className="admin-layout__sidebar" aria-label="Admin navigation">
          <SidebarInner onLogout={onLogout} />
        </aside>
      ) : null}

      {isMobile ? (
        <Drawer
          open={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          PaperProps={{ className: "admin-layout__drawer-paper" }}
        >
          <div className="admin-layout__drawer" aria-label="Admin navigation">
            <SidebarInner
              onNavigate={() => setIsNavOpen(false)}
              onLogout={onLogout}
            />
          </div>
        </Drawer>
      ) : null}

      <section className="admin-layout__content">
        {isMobile ? (
          <div className="admin-layout__mobile-topbar">
            <IconButton
              aria-label="Abrir menú"
              onClick={() => setIsNavOpen(true)}
              className="admin-layout__mobile-menu-button"
            >
              <MenuIcon />
            </IconButton>
            <div className="admin-layout__mobile-brand">Logic Admin</div>
          </div>
        ) : null}
        <Outlet />
      </section>
    </div>
  );
}
