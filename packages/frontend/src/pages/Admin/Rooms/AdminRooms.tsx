import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type RoomRow = {
  id: number;
  name: string;
  description: string | null;
  theme: string | null;
  min_players: number | null;
  max_players: number | null;
  min_age: number | null;
  duration_minutes: number | null;
  difficulty: number | null;
  active: number | null;
};

type FormState = {
  name: string;
  description: string;
  theme: string;
  minPlayers: string;
  maxPlayers: string;
  minAge: string;
  durationMinutes: string;
  difficulty: string;
  active: "1" | "0";
};

export default function AdminRooms() {
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    theme: "",
    minPlayers: "",
    maxPlayers: "",
    minAge: "",
    durationMinutes: "",
    difficulty: "",
    active: "1",
  });

  const sorted = useMemo(() => [...rows].sort((a, b) => b.id - a.id), [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<RoomRow[]>("/api/admin/rooms");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({ type: "error", message: "No se pudieron cargar las salas." });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/rooms", {
        method: "POST",
        body: {
          name: form.name,
          description: form.description || null,
          theme: form.theme || null,
          minPlayers: form.minPlayers ? Number(form.minPlayers) : null,
          maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
          minAge: form.minAge ? Number(form.minAge) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          difficulty: form.difficulty ? Number(form.difficulty) : null,
          active: form.active === "1" ? 1 : 0,
        },
      });
      setForm((s) => ({ ...s, name: "" }));
      setStatus({ type: "success", message: "Sala creada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo crear la sala." });
    }
  }

  async function update(row: RoomRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rooms/${row.id}`, {
        method: "PUT",
        body: {
          name: row.name,
          description: row.description,
          theme: row.theme,
          minPlayers: row.min_players,
          maxPlayers: row.max_players,
          minAge: row.min_age,
          durationMinutes: row.duration_minutes,
          difficulty: row.difficulty,
          active: row.active ?? 1,
        },
      });
      setStatus({ type: "success", message: "Sala actualizada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo actualizar la sala." });
    }
  }

  async function remove(id: number) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/rooms/${id}`, { method: "DELETE" });
      setStatus({ type: "success", message: "Sala eliminada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la sala." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <h1 className="admin-crud__title">Salas</h1>
          <div className="admin-crud__subtitle">Gestiona la tabla `rooms`.</div>
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
              <span className="admin-crud__label">Nombre</span>
              <input
                className="admin-crud__input"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </label>
            <label className="admin-crud__field">
              <span className="admin-crud__label">Tema</span>
              <input
                className="admin-crud__input"
                value={form.theme}
                onChange={(e) => setForm((s) => ({ ...s, theme: e.target.value }))}
              />
            </label>
          </div>
          <label className="admin-crud__field">
            <span className="admin-crud__label">Descripción</span>
            <input
              className="admin-crud__input"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </label>
          <div className="admin-crud__row">
            <label className="admin-crud__field">
              <span className="admin-crud__label">Min jugadores</span>
              <input
                className="admin-crud__input"
                value={form.minPlayers}
                onChange={(e) =>
                  setForm((s) => ({ ...s, minPlayers: e.target.value }))
                }
                inputMode="numeric"
              />
            </label>
            <label className="admin-crud__field">
              <span className="admin-crud__label">Max jugadores</span>
              <input
                className="admin-crud__input"
                value={form.maxPlayers}
                onChange={(e) =>
                  setForm((s) => ({ ...s, maxPlayers: e.target.value }))
                }
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="admin-crud__row">
            <label className="admin-crud__field">
              <span className="admin-crud__label">Edad mínima</span>
              <input
                className="admin-crud__input"
                value={form.minAge}
                onChange={(e) => setForm((s) => ({ ...s, minAge: e.target.value }))}
                inputMode="numeric"
              />
            </label>
            <label className="admin-crud__field">
              <span className="admin-crud__label">Duración (min)</span>
              <input
                className="admin-crud__input"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, durationMinutes: e.target.value }))
                }
                inputMode="numeric"
              />
            </label>
          </div>
          <div className="admin-crud__row">
            <label className="admin-crud__field">
              <span className="admin-crud__label">Dificultad (1..3)</span>
              <input
                className="admin-crud__input"
                value={form.difficulty}
                onChange={(e) =>
                  setForm((s) => ({ ...s, difficulty: e.target.value }))
                }
                inputMode="numeric"
              />
            </label>
            <label className="admin-crud__field">
              <span className="admin-crud__label">Activa</span>
              <select
                className="admin-crud__select"
                value={form.active}
                onChange={(e) =>
                  setForm((s) => ({ ...s, active: e.target.value as "1" | "0" }))
                }
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </label>
          </div>
          <div className="admin-crud__actions">
            <button
              type="button"
              className="admin-crud__button admin-crud__button--primary"
              onClick={() => void create()}
              disabled={status.type === "loading" || !form.name.trim()}
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
              <th className="admin-crud__th">Nombre</th>
              <th className="admin-crud__th">Activa</th>
              <th className="admin-crud__th">Min/Max</th>
              <th className="admin-crud__th">Duración</th>
              <th className="admin-crud__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.name}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x))
                      )
                    }
                  />
                </td>
                <td className="admin-crud__td">
                  <select
                    className="admin-crud__select"
                    value={String(r.active ?? 1)}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, active: e.target.value === "1" ? 1 : 0 } : x
                        )
                      )
                    }
                  >
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>
                </td>
                <td className="admin-crud__td">
                  <div className="admin-crud__row">
                    <input
                      className="admin-crud__input"
                      value={r.min_players ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, min_players: Number(e.target.value) } : x
                          )
                        )
                      }
                      inputMode="numeric"
                    />
                    <input
                      className="admin-crud__input"
                      value={r.max_players ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, max_players: Number(e.target.value) } : x
                          )
                        )
                      }
                      inputMode="numeric"
                    />
                  </div>
                </td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.duration_minutes ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === r.id
                            ? { ...x, duration_minutes: Number(e.target.value) }
                            : x
                        )
                      )
                    }
                    inputMode="numeric"
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

