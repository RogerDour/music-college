// client/src/pages/Signup.jsx
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
  Paper,
  Link,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTranslation } from "react-i18next";
import { signup } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!form.name || !form.email || !form.password) {
      setErr(t("fillFields"));
      return;
    }
    setLoading(true);
    try {
      await signup({ ...form, role: "student" });
      setOk(t("signupSuccess"));
      setForm({ name: "", email: "", password: "" });
      navigate("/login");
    } catch (e2) {
      console.error("Signup error:", e2);
      setErr(e2?.response?.data?.error || t("signupFailed"));
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
          {t("signup")}
        </Typography>

        {err && <Alert severity="error">{err}</Alert>}
        {ok && <Alert severity="success">{ok}</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <form onSubmit={onSubmit} style={{ width: "100%" }}>
            <Stack spacing={2}>
              <TextField
                label={t("name")}
                name="name"
                value={form.name}
                onChange={onChange}
                fullWidth
                autoComplete="name"
              />
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
                autoComplete="new-password"
                helperText={t("pwRules")}
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
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                {loading ? t("loading") || "Loading…" : t("createAccount")}
              </Button>

              {/* Link back to login */}
              <Stack direction="row" justifyContent="flex-end">
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate("/login")}
                >
                  {t("haveAccount") || "Already have an account? Log in"}
                </Link>
              </Stack>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  );
}
