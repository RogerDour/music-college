// client/src/pages/ResetPassword.jsx
import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Paper,
} from "@mui/material";
import axios from "axios";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { token: tokenFromPath } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const tokenFromQuery = new URLSearchParams(location.search).get("token");
  const token = tokenFromPath || tokenFromQuery;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!token) setErr(t("missingToken") || "Missing or invalid reset token.");
  }, [token, t]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!token)
      return setErr(t("missingToken") || "Missing or invalid reset token.");
    if (!password || password.length < 6)
      return setErr(
        t("weakPassword") || "Password must be at least 6 characters.",
      );
    if (password !== confirm)
      return setErr(t("passwordsDontMatch") || "Passwords do not match.");

    setLoading(true);
    try {
      await axios.post(`${BASE}/auth/reset`, { token, password });
      setOk(t("passwordChanged") || "Password changed. Redirecting to login…");
      setTimeout(() => navigate("/login"), 1200);
    } catch (e2) {
      console.error(e2);
      setErr(e2?.response?.data?.error || t("resetFailed") || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" align="center">
          {t("resetPassword") || "Reset Password"}
        </Typography>

        {err && <Alert severity="error">{err}</Alert>}
        {ok && <Alert severity="success">{ok}</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                type="password"
                label={t("newPassword") || "New password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              <TextField
                type="password"
                label={t("confirmPassword") || "Confirm password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !token}
              >
                {loading
                  ? t("loading") || "Loading…"
                  : t("setNewPassword") || "Set new password"}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate("/login")}
              >
                {t("backToLogin") || "Back to Login"}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  );
}
