import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Collapse,
  Drawer,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import "./AdminLayout.scss";

type NavItem = {
  to: string;
  label: string;
  roles: string[];
};

type NavGroup = {
  id: string;
  label: string;
  icon: typeof CalendarMonthIcon;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "operation",
    label: "Operacion",
    icon: CalendarMonthIcon,
    items: [
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
    ],
  },
  {
    id: "cafeteria",
    label: "Cafeteria",
    icon: Inventory2Icon,
    items: [
      {
        to: "/admin/dashboard/cafeteria",
        label: "Productos",
        roles: ["admin", "game_master"],
      },
      {
        to: "/admin/dashboard/cafeteria/promociones",
        label: "Promociones",
        roles: ["admin", "game_master"],
      },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    icon: AccountBalanceWalletIcon,
    items: [
      {
        to: "/admin/dashboard/cuentas-financieras",
        label: "Cuentas financieras",
        roles: ["admin"],
      },
    ],
  },
  {
    id: "commercial-settings",
    label: "Configuracion comercial",
    icon: SettingsIcon,
    items: [
      {
        to: "/admin/dashboard/precios",
        label: "Precios de salas",
        roles: ["admin"],
      },
      { to: "/admin/dashboard/festivos", label: "Festivos", roles: ["admin"] },
      {
        to: "/admin/dashboard/horarios",
        label: "Horarios de apertura",
        roles: ["admin"],
      },
      { to: "/admin/dashboard/salas", label: "Salas", roles: ["admin"] },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: SettingsIcon,
    items: [
      {
        to: "/admin/dashboard/configuraciones",
        label: "Ajustes generales",
        roles: ["admin"],
      },
      { to: "/admin/dashboard/usuarios", label: "Usuarios", roles: ["admin"] },
    ],
  },
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

function pathMatchesNavItem(pathname: string, item: NavItem) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function getActiveGroupId(groups: NavGroup[], pathname: string) {
  if (pathname === "/admin/dashboard") return groups[0]?.id;
  return groups.find((group) =>
    group.items.some((item) => pathMatchesNavItem(pathname, item)),
  )?.id;
}

function SidebarInner({
  groups,
  activeGroupId,
  onNavigate,
  onLogout,
}: {
  groups: NavGroup[];
  activeGroupId?: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <>
      <div className="admin-layout__brand">Logic Admin</div>
      <nav className="admin-layout__nav">
        {groups.map((group) => {
          const isActiveGroup = group.id === activeGroupId;
          const isOpen = isActiveGroup || openGroups.has(group.id);
          const GroupIcon = group.icon;

          return (
            <div
              key={group.id}
              className={[
                "admin-layout__nav-group",
                isActiveGroup ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                className="admin-layout__group-button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
              >
                <GroupIcon className="admin-layout__group-icon" />
                <span>{group.label}</span>
                <ExpandMoreIcon
                  className={[
                    "admin-layout__group-chevron",
                    isOpen ? "is-open" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <div className="admin-layout__group-links">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
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
                </div>
              </Collapse>
            </div>
          );
        })}
      </nav>

      <Button
        variant="outlined"
        color="inherit"
        className="admin-layout__logout"
        onClick={onLogout}
      >
        Cerrar sesion
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
  const allowedNavGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((group) => group.items.length > 0);
  }, [role]);
  const allowedNavItems = useMemo(
    () => allowedNavGroups.flatMap((group) => group.items),
    [allowedNavGroups],
  );
  const activeGroupId = useMemo(
    () => getActiveGroupId(allowedNavGroups, location.pathname),
    [allowedNavGroups, location.pathname],
  );

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token || !adminUser) navigate("/admin", { replace: true });
  }, [adminUser, navigate]);

  useEffect(() => {
    if (location.pathname === "/admin/dashboard") return;
    if (allowedNavItems.length === 0) return;
    const allowed = allowedNavItems.some((item) =>
      pathMatchesNavItem(location.pathname, item),
    );
    if (!allowed) {
      navigate(allowedNavItems[0].to, { replace: true });
    }
  }, [allowedNavItems, location.pathname, navigate]);

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
          <SidebarInner
            groups={allowedNavGroups}
            activeGroupId={activeGroupId}
            onLogout={onLogout}
          />
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
              groups={allowedNavGroups}
              activeGroupId={activeGroupId}
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
              aria-label="Abrir menu"
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
