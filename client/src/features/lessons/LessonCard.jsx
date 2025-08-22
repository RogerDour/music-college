import {
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Tooltip,
  Button,
  Typography,
} from "@mui/material";

export default function LessonCard({
  lesson,
  onEdit,
  onToggleComplete,
  onToggleAttended,
  onDelete,
  onCancel, // student cancel (optional)
}) {
  const start = new Date(lesson.date);
  const dur = lesson.duration || 60;
  const end = new Date(start.getTime() + dur * 60000);
  const isPast = end.getTime() < Date.now();

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {lesson.title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {start.toLocaleString()} — {end.toLocaleString()} ({dur}m)
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="body2">
          <strong>Teacher:</strong>{" "}
          {lesson.teacherId?.name || lesson.teacherId?.email || "—"}
        </Typography>
        <Typography variant="body2">
          <strong>Student:</strong>{" "}
          {lesson.studentId?.name || lesson.studentId?.email || "—"}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>Status:</strong> {lesson.status}
        </Typography>

        {lesson.attended && (
          <Chip label="Attended" size="small" color="success" sx={{ mt: 1 }} />
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
        {onEdit && (
          <Tooltip
            title={isPast ? "Past lessons can’t be edited" : ""}
            disableHoverListener={!isPast}
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onEdit(lesson)}
                disabled={isPast}
              >
                Edit
              </Button>
            </span>
          </Tooltip>
        )}

        {onToggleComplete && (
          <Tooltip
            title={isPast ? "Past lessons can’t be edited" : ""}
            disableHoverListener={!isPast}
          >
            <span>
              <Button
                size="small"
                onClick={() => onToggleComplete(lesson)}
                disabled={isPast}
              >
                {lesson.status === "completed"
                  ? "Mark Scheduled"
                  : "Mark Completed"}
              </Button>
            </span>
          </Tooltip>
        )}

        {onToggleAttended && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onToggleAttended(lesson)}
          >
            {lesson.attended ? "Unmark Attended" : "Mark Attended"}
          </Button>
        )}

        {onDelete && (
          <Tooltip
            title={isPast ? "Past lessons can’t be deleted" : ""}
            disableHoverListener={!isPast}
          >
            <span>
              <Button
                size="small"
                color="error"
                onClick={() => onDelete(lesson._id)}
                disabled={isPast}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
        )}

        {onCancel && (
          <Tooltip
            title={isPast ? "Past lessons can’t be cancelled" : ""}
            disableHoverListener={!isPast}
          >
            <span>
              <Button
                size="small"
                color="error"
                onClick={() => onCancel(lesson)}
                disabled={isPast}
              >
                Cancel
              </Button>
            </span>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}
