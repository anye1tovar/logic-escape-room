import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type SettingRow = { key: string; value: string };

export default function AdminSettings() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.key.localeCompare(b.key)),
    [rows]
  );

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<SettingRow[]>("/api/admin/settings");
      setRows(data);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las configuraciones.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upsert(key: string, value: string) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: { value },
      });
      setStatus({ type: "success", message: "Configuración guardada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo guardar la configuración." });
    }
  }

  async function remove(key: string) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      setStatus({ type: "success", message: "Configuración eliminada." });
      await load();
    } catch {
      setStatus({ type: "error", message: "No se pudo eliminar la configuración." });
    }
  }

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <h1 className="admin-crud__title">Configuraciones</h1>
          <div className="admin-crud__subtitle">Gestiona la tabla `settings`.</div>
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
              <span className="admin-crud__label">Key</span>
              <input
                className="admin-crud__input"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="whatsapp_number"
              />
            </label>
            <label className="admin-crud__field">
              <span className="admin-crud__label">Value</span>
              <input
                className="admin-crud__input"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder="+57..."
              />
            </label>
          </div>
          <div className="admin-crud__actions">
            <button
              type="button"
              className="admin-crud__button admin-crud__button--primary"
              onClick={() => void upsert(keyInput, valueInput)}
              disabled={status.type === "loading" || !keyInput.trim()}
            >
              Guardar
            </button>
          </div>
        </div>
      </section>

      <section className="admin-crud__panel">
        <table className="admin-crud__table">
          <thead>
            <tr>
              <th className="admin-crud__th">Key</th>
              <th className="admin-crud__th">Value</th>
              <th className="admin-crud__th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.key}>
                <td className="admin-crud__td">{r.key}</td>
                <td className="admin-crud__td">
                  <input
                    className="admin-crud__input"
                    value={r.value}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.key === r.key ? { ...x, value: e.target.value } : x
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
                      onClick={() => void upsert(r.key, r.value)}
                      disabled={status.type === "loading"}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="admin-crud__button admin-crud__button--danger"
                      onClick={() => void remove(r.key)}
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

