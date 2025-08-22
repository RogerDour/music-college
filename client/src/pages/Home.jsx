// client/src/pages/Home.jsx
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Layout from "../components/Layout";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

function InfoPanel({ title, desc, actions }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
      role="region"
      aria-label={title}
    >
      <Box>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {desc}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        {actions}
      </Stack>
    </Stack>
  );
}

function AuthedHome({ role = "student" }) {
  const { t } = useTranslation();

  const labels = {
    dashboard: t("Dashboard", { defaultValue: "Dashboard" }),
    users: t("Users", { defaultValue: "Users" }),
    manageLessons: t("Manage Lessons", { defaultValue: "Manage Lessons" }),
    courses: t("Courses", { defaultValue: "Courses" }),
    suggest: t("openSuggest"),
    notifications: t("notifications"),
    lessons: t("My Lessons", { defaultValue: "My Lessons" }),
  };

  const linksByRole = {
    admin: [
      { to: "/dashboard", label: labels.dashboard },
      { to: "/users", label: labels.users },
      { to: "/manage-lessons", label: labels.manageLessons },
      { to: "/courses", label: labels.courses },
      { to: "/notifications", label: labels.notifications },
      { to: "/analytics", label: "Analytics" },
    ],
    teacher: [
      { to: "/dashboard", label: labels.dashboard },
      { to: "/users", label: labels.users },
      { to: "/manage-lessons", label: labels.manageLessons },
      { to: "/courses", label: labels.courses },
      { to: "/suggest", label: labels.suggest },
      { to: "/notifications", label: labels.notifications },
    ],
    student: [
      { to: "/dashboard", label: labels.dashboard },
      { to: "/lessons", label: labels.lessons },
      { to: "/courses", label: labels.courses },
      { to: "/suggest", label: labels.suggest },
      { to: "/notifications", label: labels.notifications },
    ],
  };

  const tiles = linksByRole[role] || linksByRole.student;

  useEffect(() => {
    document.title = `${t("appName")} – ${t("welcomeBack")}`;
  }, [t]);

  return (
    <Layout role={role}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          {t("welcomeBack")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t("quickActionsDesc")}
        </Typography>

        {/* Quick Actions */}
        <Grid container spacing={2}>
          {tiles.map((tItem) => (
            <Grid item xs={12} sm={6} md={4} key={tItem.to}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                aria-label={tItem.label}
              >
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  {tItem.label}
                </Typography>
                <Typography variant="body2" sx={{ flexGrow: 1, opacity: 0.8 }}>
                  {t("goToX", { label: tItem.label.toLowerCase?.() || tItem.label })}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button
                    component={RouterLink}
                    to={tItem.to}
                    variant="contained"
                    size="small"
                  >
                    {t("open")}
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Helpful panels */}
        <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
          <InfoPanel
            title={t("needCoordinate")}
            desc={t("needCoordinateDesc")}
            actions={
              <>
                <Button
                  component={RouterLink}
                  to="/suggest"
                  variant="contained"
                  size="small"
                >
                  {t("openSuggest")}
                </Button>
                <Button
                  component={RouterLink}
                  to="/availability"
                  variant="outlined"
                  size="small"
                >
                  {t("myAvailability")}
                </Button>
              </>
            }
          />

          <Divider sx={{ my: 2 }} />

          <InfoPanel
            title={t("chatMessages")}
            desc={t("chatMessagesDesc")}
            actions={
              <>
                <Button
                  component={RouterLink}
                  to="/users"
                  variant="outlined"
                  size="small"
                >
                  {t("browseUsers")}
                </Button>
                <Button
                  component={RouterLink}
                  to="/courses"
                  variant="outlined"
                  size="small"
                >
                  {t("courseChat")}
                </Button>
                <Button
                  component={RouterLink}
                  to="/notifications"
                  variant="outlined"
                  size="small"
                >
                  {t("notifications")}
                </Button>
              </>
            }
          />
        </Paper>
      </Container>
    </Layout>
  );
}

function PublicHome() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("appName");
  }, [t]);

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
      <Container maxWidth="md" sx={{ textAlign: "center" }}>
        <Typography component="h1" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          {t("appName")}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          {t("landingSubtitle")}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
        >
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
          >
            {t("loginCta")}
          </Button>
          <Button
            component={RouterLink}
            to="/signup"
            variant="outlined"
            size="large"
          >
            {t("signupCta")}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

export default function Home() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "student";
  return token ? <AuthedHome role={role} /> : <PublicHome />;
}
