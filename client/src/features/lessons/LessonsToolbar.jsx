import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
} from "@mui/material";

export default function LessonsToolbar({
  showOnlyMine = false,
  onlyMine,
  setOnlyMine,
  status,
  setStatus,
  q,
  setQ,
  onRefresh,
}) {
  return (
    <Grid container spacing={2} alignItems="center">
      {showOnlyMine && (
        <Grid item>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
              />
            }
            label="Only my lessons"
          />
        </Grid>
      )}

      <Grid item>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item sx={{ flexGrow: 1 }} xs={12} md="auto">
        <TextField
          size="small"
          label="Search (title / teacher / student)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          fullWidth
        />
      </Grid>

      <Grid item>
        <Button variant="outlined" onClick={onRefresh}>
          Refresh
        </Button>
      </Grid>
    </Grid>
  );
}
