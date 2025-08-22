import { useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Paper,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    const trimmed = email.trim();
    if (!trimmed) {
      setErr(t("fillFields") || "Please fill all required fields.");
      return;
    }

    // (optional) very light email format check
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setErr(t("invalidEmail") || "Please enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      // server route implemented: POST /api/auth/forgot  (aliases /forgot-password optional)
      await axios.post(`${BASE}/auth/forgot`, { email: trimmed });

      // Always generic message to avoid user enumeration
      setOk(
        t("resetLinkSent") ||
          "If this email exists in our system, a password reset link has been sent.",
      );
      setEmail("");
    } catch (e2) {
      console.error("forgot error:", e2?.response || e2);
      const msg =
        e2?.response?.data?.error ||
        t("resetFailed") ||
        "Failed to send reset email. Please try again.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" align="center">
          {t("forgotPassword") || "Forgot Password"}
        </Typography>

        {err && <Alert severity="error">{err}</Alert>}
        {ok && <Alert severity="success">{ok}</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                type="email"
                label={t("email") || "Email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />

              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                {loading
                  ? t("loading") || "Loading…"
                  : t("sendResetLink") || "Send Reset Link"}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                {t("backToLogin") || "Back to Login"}
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Optional helper for dev: quick note where to find the link */}
        <Typography variant="body2" color="text.secondary" align="center">
          {t("devHint") ||
            "Dev hint: if SMTP is not configured, the reset link is printed in the server console."}
        </Typography>
      </Stack>
    </Container>
  );
}
