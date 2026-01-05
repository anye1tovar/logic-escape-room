import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type OpeningHour = {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isOpen: number;
};

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminOpeningHours() {
  const [rows, setRows] = useState<OpeningHour[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<OpeningHour[]>("/api/admin/opening-hours");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar los horarios de apertura.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(row: OpeningHour) {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/opening-hours", {
        method: "PUT",
        body: row,
      });
      setStatus({ type: "success", message: "Horario guardado." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo guardar el horario." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <h1 className="admin-crud__title">Horarios de apertura</h1>
          <div className="admin-crud__subtitle">
            Gestiona la tabla `opening_hours` (por día 0..6).
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
        <table className="admin-crud__table">
          <thead>
            <tr>
              <th className="admin-crud__th">Día</th>
              <th className="admin-crud__th">Abre</th>
              <th className="admin-crud__th">Cierra</th>
              <th className="admin-crud__th">Abierto</th>
              <th className="admin-crud__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.dayOfWeek}>
                <td className="admin-crud__td">
                  {dayNames[r.dayOfWeek] ?? String(r.dayOfWeek)} ({r.dayOfWeek})
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.openTime ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.dayOfWeek === r.dayOfWeek
                            ? { ...x, openTime: e.target.value || null }
                            : x
                        )
                      )
                    }
                    placeholder="09:00"
                  />
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.closeTime ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.dayOfWeek === r.dayOfWeek
                            ? { ...x, closeTime: e.target.value || null }
                            : x
                        )
                      )
                    }
                    placeholder="19:00"
                  />
                </td>
                <td className="admin-crud__td">
                  <select
                    className="admin-crud__select"
                    value={String(r.isOpen)}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.dayOfWeek === r.dayOfWeek
                            ? { ...x, isOpen: e.target.value === "1" ? 1 : 0 }
                            : x
                        )
                      )
                    }
                  >
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>
                </td>
                <td className="admin-crud__td">
                  <button
                    type="button"
                    className="admin-crud__button admin-crud__button--primary"
                    onClick={() => void save(r)}
                    disabled={status.type === "loading"}
                  >
                    Guardar
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td className="admin-crud__td" colSpan={5}>
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

