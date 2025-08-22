import { useEffect, useState } from "react";
import { myEnrollments } from "../api/enrollments";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Button,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function MyCourses() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    myEnrollments().then(setItems);
  }, []);

  if (!items) {
    return (
      <Stack direction="row" spacing={1} sx={{ p: 2 }}>
        <CircularProgress size={20} />
        <Typography>Loading…</Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        My Courses
      </Typography>
      {items.length === 0 ? (
        <Typography>No enrollments yet.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {items.map((e) => {
            const c = e.courseId || {};
            const id = c._id || c.id;
            return (
              <Card key={e._id} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {c.title || "(untitled)"}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Status: {e.status}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={`/courses/${id}/materials`}
                    size="small"
                    sx={{ mt: 1, textTransform: "none" }}
                    variant="outlined"
                  >
                    Open materials
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
