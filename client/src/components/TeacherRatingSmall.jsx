// client/src/components/TeacherRatingSmall.jsx
import { useEffect, useState } from "react";
import { getTeacherSummary, listTeacherFeedback } from "../api/feedback";
import {
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";

export default function TeacherRatingSmall({ teacherId }) {
  const [sum, setSum] = useState({ avg: null, count: 0 });
  const [open, setOpen] = useState(false);
  const [list, setList] = useState({ rows: [], total: 0, page: 1, limit: 10 });

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const s = await getTeacherSummary(teacherId);
        if (on) setSum(s);
      } catch {
        if (on) setSum({ avg: null, count: 0 });
      }
    })();
    return () => {
      on = false;
    };
  }, [teacherId]);

  const loadList = async (page = 1) => {
    try {
      const data = await listTeacherFeedback(teacherId, { page, limit: 10 });
      setList(data);
    } catch {
      setList({ rows: [], total: 0, page, limit: 10 });
    }
  };

  if (!teacherId) return null;

  const label =
    sum.avg == null
      ? "No ratings yet"
      : `★ ${Number(sum.avg).toFixed(1)} (${sum.count})`;

  return (
    <>
      <Tooltip
        title={
          sum.avg == null
            ? "No ratings yet"
            : `${sum.count} rating${sum.count === 1 ? "" : "s"}`
        }
      >
        <Chip
          size="small"
          color={sum.avg == null ? "default" : "primary"}
          icon={<StarIcon fontSize="small" />}
          label={label}
          onClick={async () => {
            setOpen(true);
            await loadList(1);
          }}
          sx={{ cursor: "pointer" }}
        />
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Teacher feedback</DialogTitle>
        <DialogContent dividers>
          {list.rows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No feedback yet.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {list.rows.map((r) => (
                <Stack key={r._id} spacing={0.5}>
                  <Typography variant="subtitle2">
                    ★ {Number(r.rating).toFixed(1)}
                  </Typography>
                  {r.comment && (
                    <Typography variant="body2">{r.comment}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {new Date(r.createdAt).toLocaleString()}
                    {r.student?.name ? ` • ${r.student.name}` : ""}
                  </Typography>
                  <Divider sx={{ mt: 1 }} />
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
