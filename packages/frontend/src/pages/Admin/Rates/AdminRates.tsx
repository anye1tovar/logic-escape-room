import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type RateRow = {
  id: number;
  day_type: "weekday" | "weekend";
  day_label: string | null;
  day_range: string | null;
  players: number;
  price_per_person: number;
  currency: string;
};

type FormState = {
  dayType: "weekday" | "weekend";
  dayLabel: string;
  dayRange: string;
  players: string;
  pricePerPerson: string;
  currency: string;
};

export default function AdminRates() {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>({
    dayType: "weekday",
    dayLabel: "",
    dayRange: "",
    players: "4",
    pricePerPerson: "30000",
    currency: "COP",
  });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.day_type !== b.day_type) return a.day_type.localeCompare(b.day_type);
      return b.players - a.players;
    });
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<RateRow[]>("/api/admin/rates");
      setRows(data);
      setStatus({ type: "idle" });
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudieron cargar los precios." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/rates", {
        method: "POST",
        body: {
          dayType: form.dayType,
          dayLabel: form.dayLabel || null,
          dayRange: form.dayRange || null,
          players: Number(form.players),
          pricePerPerson: Number(form.pricePerPerson),
          currency: form.currency || "COP",
        },
      });
      setStatus({ type: "success", message: "Precio creado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo crear el precio." });
    }
  }

  async function update(row: RateRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rates/${row.id}`, {
        method: "PUT",
        body: {
          dayType: row.day_type,
          dayLabel: row.day_label,
          dayRange: row.day_range,
          players: row.players,
          pricePerPerson: row.price_per_person,
          currency: row.currency,
        },
      });
      setStatus({ type: "success", message: "Precio actualizado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo actualizar el precio." });
    }
  }

  async function remove(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rates/${id}`, { method: "DELETE" });
      setStatus({ type: "success", message: "Precio eliminado." });
      await load();
    } catch (err: unknown) {
      setStatus({ type: "error", message: "No se pudo eliminar el precio." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <h1 className="admin-crud__title">Precios</h1>
          <div className="admin-crud__subtitle">Gestiona la tabla `rates`.</div>
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
              <span className="admin-crud__label">Tipo de día</span>
              <select
                className="admin-crud__select"
                value={form.dayType}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    dayType: e.target.value as "weekday" | "weekend",
                  }))
                }
              >
                <option value="weekday">weekday</option>
                <option value="weekend">weekend</option>
              </select>
            </label>

            <label className="admin-crud__field">
              <span className="admin-crud__label">Jugadores</span>
              <input
                className="admin-crud__input"
                value={form.players}
                onChange={(e) => setForm((s) => ({ ...s, players: e.target.value }))}
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="admin-crud__row">
            <label className="admin-crud__field">
              <span className="admin-crud__label">Precio por persona</span>
              <input
                className="admin-crud__input"
                value={form.pricePerPerson}
                onChange={(e) =>
                  setForm((s) => ({ ...s, pricePerPerson: e.target.value }))
                }
                inputMode="numeric"
              />
            </label>

            <label className="admin-crud__field">
              <span className="admin-crud__label">Moneda</span>
              <input
                className="admin-crud__input"
                value={form.currency}
                onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
              />
            </label>
          </div>

          <div className="admin-crud__row">
            <label className="admin-crud__field">
              <span className="admin-crud__label">Etiqueta</span>
              <input
                className="admin-crud__input"
                value={form.dayLabel}
                onChange={(e) => setForm((s) => ({ ...s, dayLabel: e.target.value }))}
              />
            </label>

            <label className="admin-crud__field">
              <span className="admin-crud__label">Rango</span>
              <input
                className="admin-crud__input"
                value={form.dayRange}
                onChange={(e) => setForm((s) => ({ ...s, dayRange: e.target.value }))}
              />
            </label>
          </div>

          <div className="admin-crud__actions">
            <button
              type="button"
              className="admin-crud__button admin-crud__button--primary"
              onClick={() => void create()}
              disabled={status.type === "loading"}
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
              <th className="admin-crud__th">Tipo</th>
              <th className="admin-crud__th">Jugadores</th>
              <th className="admin-crud__th">Precio</th>
              <th className="admin-crud__th">Label</th>
              <th className="admin-crud__th">Rango</th>
              <th className="admin-crud__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td className="admin-crud__td">
                  <select
                    className="admin-crud__select"
                    value={r.day_type}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id
                            ? { ...x, day_type: e.target.value as RateRow["day_type"] }
                            : x
                        )
                      )
                    }
                  >
                    <option value="weekday">weekday</option>
                    <option value="weekend">weekend</option>
                  </select>
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={String(r.players)}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, players: Number(e.target.value) } : x
                        )
                      )
                    }
                    inputMode="numeric"
                  />
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={String(r.price_per_person)}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id
                            ? { ...x, price_per_person: Number(e.target.value) }
                            : x
                        )
                      )
                    }
                    inputMode="numeric"
                  />
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.day_label ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, day_label: e.target.value } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.day_range ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, day_range: e.target.value } : x
                        )
                      )
                    }
                  />
                </td>
                <td className="admin-crud__td">
                  <div className="admin-crud__actions">
                    <button
                      type="button"
                      className="admin-crud__button admin-crud__button--primary"
                      onClick={() => void update(r)}
                      disabled={status.type === "loading"}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="admin-crud__button admin-crud__button--danger"
                      onClick={() => void remove(r.id)}
                      disabled={status.type === "loading"}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td className="admin-crud__td" colSpan={6}>
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

