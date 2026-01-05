import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type HolidayRow = { date: string; name: string | null };

export default function AdminHolidays() {
  const [rows, setRows] = useState<HolidayRow[]>([]);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<HolidayRow[]>("/api/admin/holidays");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({ type: "error", message: "No se pudieron cargar los festivos." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/holidays", {
        method: "POST",
        body: { date, name: name || null },
      });
      setDate("");
      setName("");
      setStatus({ type: "success", message: "Festivo creado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear el festivo." });
    }
  }

  async function remove(holidayDate: string) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/holidays/${encodeURIComponent(holidayDate)}`, {
        method: "DELETE",
      });
      setStatus({ type: "success", message: "Festivo eliminado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar el festivo." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <h1 className="admin-crud__title">Festivos</h1>
          <div className="admin-crud__subtitle">
            Gestiona la tabla `colombian_holidays`.
          </div>
        </div>
        <div className="admin-crud__actions">
          <button
            type="button"
            className="admin-crud__button"
            onClick={() => void load()}
            disabled={status.type === "loading"}
          >
            Recargar
          </button>
        </div>
      </header>

      {status.type === "error" ? (
        <div className="admin-crud__message admin-crud__message--error">
          {status.message}
        </div>
      ) : null}
      {status.type === "success" ? (
        <div className="admin-crud__message admin-crud__message--success">
          {status.message}
        </div>
      ) : null}

      <section className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__row">
            <label className="admin-crud__field">
              <span className="admin-crud__label">Fecha (YYYY-MM-DD)</span>
              <input
                className="admin-crud__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2026-01-01"
              />
            </label>

            <label className="admin-crud__field">
              <span className="admin-crud__label">Nombre (opcional)</span>
              <input
                className="admin-crud__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Año nuevo"
              />
            </label>
          </div>
          <div className="admin-crud__actions">
            <button
              type="button"
              className="admin-crud__button admin-crud__button--primary"
              onClick={() => void create()}
              disabled={status.type === "loading" || !date.trim()}
            >
              Crear
            </button>
          </div>
        </div>
      </section>

      <section className="admin-crud__panel">
        <table className="admin-crud__table">
          <thead>
            <tr>
              <th className="admin-crud__th">Fecha</th>
              <th className="admin-crud__th">Nombre</th>
              <th className="admin-crud__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.date}>
                <td className="admin-crud__td">{r.date}</td>
                <td className="admin-crud__td">{r.name ?? ""}</td>
                <td className="admin-crud__td">
                  <button
                    type="button"
                    className="admin-crud__button admin-crud__button--danger"
                    onClick={() => void remove(r.date)}
                    disabled={status.type === "loading"}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td className="admin-crud__td" colSpan={3}>
                  Sin registros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

