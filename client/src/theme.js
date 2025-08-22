import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const base = {
  palette: { mode: "light", primary: { main: "#1a73e8" } },
  components: {
    MuiButton: { defaultProps: { variant: "contained" } },
    MuiTextField: { defaultProps: { fullWidth: true, margin: "normal" } },
  },
};

export const themeLtr = responsiveFontSizes(
  createTheme({ ...base, direction: "ltr" }),
);
export const themeRtl = responsiveFontSizes(
  createTheme({ ...base, direction: "rtl" }),
);
