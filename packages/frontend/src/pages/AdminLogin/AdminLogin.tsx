import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, TextField } from "@mui/material";
import { login } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.scss";

type LoginState =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginState, setLoginState] = useState<LoginState>({ type: "idle" });

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.trim().length > 0;
  }, [password, username]);

  return (
    <div className="admin-login">
      <main className="admin-login__main">
        <div className="admin-login__container">
          <header className="admin-login__header">
            <div className="admin-login__title-block">
              <p className="admin-login__eyebrow">{t("admin.login.eyebrow")}</p>
              <h1 className="admin-login__title">
                <span>{t("admin.login.titleLine1")}</span>
                <span className="admin-login__title-accent">
                  {t("admin.login.titleLine2")}
                </span>
              </h1>
            </div>

            <div className="admin-login__copy">
              <p className="admin-login__subtitle">
                {t("admin.login.subtitle")}
              </p>
            </div>
          </header>

          <section
            className="admin-login__panel"
            aria-label={t("admin.login.formAria")}
          >
            <form
              className="admin-login__form"
              onSubmit={async (event) => {
                event.preventDefault();

                const normalizedUser = username.trim();
                const normalizedPass = password.trim();

                if (!normalizedUser || !normalizedPass) {
                  setLoginState({
                    type: "error",
                    message: t("admin.login.errors.required"),
                  });
                  return;
                }

                setLoginState({ type: "submitting" });
                try {
                  const result = await login({
                    email: normalizedUser,
                    password: normalizedPass,
                  });
                  localStorage.setItem("adminToken", result.token);
                  localStorage.setItem(
                    "adminUser",
                    JSON.stringify(result.user)
                  );
                  setLoginState({
                    type: "success",
                    message: t("admin.login.success"),
                  });
                  navigate("/admin/dashboard", { replace: true });
                } catch (err: unknown) {
                  setLoginState({
                    type: "error",
                    message: t("admin.login.errors.invalid"),
                  });
                }
              }}
            >
              <TextField
                label={t("admin.login.fields.username")}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  if (loginState.type !== "idle")
                    setLoginState({ type: "idle" });
                }}
                autoComplete="username"
                size="small"
                fullWidth
              />

              <TextField
                label={t("admin.login.fields.password")}
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (loginState.type !== "idle")
                    setLoginState({ type: "idle" });
                }}
                placeholder={t("admin.login.placeholders.password")}
                autoComplete="current-password"
                size="small"
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                disabled={!canSubmit || loginState.type === "submitting"}
              >
                {loginState.type === "submitting"
                  ? t("admin.login.actions.loading")
                  : t("admin.login.actions.submit")}
              </Button>

              {loginState.type === "error" ? (
                <Alert severity="error" role="alert">
                  {loginState.message}
                </Alert>
              ) : null}

              {loginState.type === "success" ? (
                <Alert severity="success" role="status">
                  {loginState.message}
                </Alert>
              ) : null}
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
