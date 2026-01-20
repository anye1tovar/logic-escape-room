import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, IconButton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import "./AdminLayout.scss";

const navItems = [
  {
    to: "/admin/dashboard/reservas",
    label: "Reservas",
    roles: ["admin", "game_master"],
  },
  {
    to: "/admin/dashboard/cronometraje",
    label: "Cronometraje",
    roles: ["admin", "game_master"],
  },
  {
    to: "/admin/dashboard/cafeteria",
    label: "Cafeteria",
    roles: ["admin", "game_master"],
  },
  { to: "/admin/dashboard/precios", label: "Precios Salas", roles: ["admin"] },
  { to: "/admin/dashboard/festivos", label: "Festivos", roles: ["admin"] },
  {
    to: "/admin/dashboard/horarios",
    label: "Horarios de apertura",
    roles: ["admin"],
  },
  { to: "/admin/dashboard/salas", label: "Salas", roles: ["admin"] },
  {
    to: "/admin/dashboard/configuraciones",
    label: "Configuraciones",
    roles: ["admin"],
  },
  { to: "/admin/dashboard/usuarios", label: "Usuarios", roles: ["admin"] },
];

type StoredUser = { role?: string };

function getStoredAdminUser(): StoredUser | null {
  const raw = localStorage.getItem("adminUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function SidebarInner({
  items,
  onNavigate,
  onLogout,
}: {
  items: typeof navItems;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="admin-layout__brand">Logic Admin</div>
      <nav className="admin-layout__nav">
        {items.map((item) => (
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
  const adminUser = useMemo(() => getStoredAdminUser(), []);
  const role = String(adminUser?.role || "admin").toLowerCase();
  const allowedNavItems = useMemo(() => {
    return navItems.filter((item) => item.roles.includes(role));
  }, [role]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token || !adminUser) navigate("/admin", { replace: true });
  }, [adminUser, navigate]);

  useEffect(() => {
    if (location.pathname === "/admin/dashboard") return;
    if (allowedNavItems.length === 0) return;
    const allowed = allowedNavItems.some((item) =>
      location.pathname.startsWith(item.to)
    );
    if (!allowed) {
      navigate(allowedNavItems[0].to, { replace: true });
    }
  }, [allowedNavItems, location.pathname, navigate]);

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
          <SidebarInner items={allowedNavItems} onLogout={onLogout} />
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
              items={allowedNavItems}
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
