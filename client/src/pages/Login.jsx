// client/src/pages/Login.jsx
import { useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Paper,
  Link,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTranslation } from "react-i18next";
import { login } from "../api/auth";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: localStorage.getItem("rememberEmail") || "",
    password: "",
    remember: !!localStorage.getItem("rememberEmail"),
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const SERVER_ORIGIN =
    import.meta.env.VITE_SERVER_ORIGIN || "http://localhost:5000";

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!form.email || !form.password) {
      setErr(t("fillFields"));
      return;
    }
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem(
        "userId",
        res.data.user.id || res.data.user._id || "",
      );
      localStorage.setItem("user", JSON.stringify(res.data.user || {}));

      if (form.remember) localStorage.setItem("rememberEmail", form.email);
      else localStorage.removeItem("rememberEmail");

      setOk(`${t("welcome")}, ${res.data.user.name || ""}`);
      setForm((s) => ({ ...s, password: "" }));
      navigate("/dashboard");
    } catch (e2) {
      console.error("Login failed", e2);
      setErr(t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 4 }}>
      <Stack spacing={2}>
        {/* Language Switch */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            onClick={() => i18n.changeLanguage("en")}
          >
            English
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => i18n.changeLanguage("he")}
          >
            עברית
          </Button>
        </Stack>

        <Typography variant="h5" align="center">
          {t("login")}
        </Typography>

        {err && <Alert severity="error">{err}</Alert>}
        {ok && <Alert severity="success">{ok}</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label={t("email")}
                name="email"
                value={form.email}
                onChange={onChange}
                fullWidth
                autoComplete="email"
              />
              <TextField
                label={t("password")}
                name="password"
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={onChange}
                fullWidth
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw((s) => !s)}
                        edge="end"
                        aria-label="toggle password"
                      >
                        {showPw ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.remember}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, remember: e.target.checked }))
                    }
                  />
                }
                label={t("rememberMe") || "Remember me"}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                {loading ? t("loading") || "Loading…" : t("login")}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() =>
                  (window.location.href = `${SERVER_ORIGIN}/auth/google`)
                }
              >
                {t("googleContinue")}
              </Button>


              {/* Links */}
              <Stack direction="row" justifyContent="space-between">
                <Link component={RouterLink} to="/forgot-password" variant="body2">
                  {t("forgotPassword")}
                </Link>
                <Link component={RouterLink} to="/signup" variant="body2">
                  {t("noAccount")}
                </Link>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  );
}
