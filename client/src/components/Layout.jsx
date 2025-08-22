// client/src/components/Layout.jsx
import Header from "./Header";
import { Box, Container } from "@mui/material";

export default function Layout({ children }) {
  return (
    <>
      <Header />
      <Container
        maxWidth={false}
        disableGutters
        sx={{ py: 2, px: { xs: 1, sm: 2 } }}
      >
        <Box
          sx={{
            p: { xs: 1, sm: 2 },
            minHeight: "60vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: { xs: 0, sm: 1 },
          }}
        >
          {children}
        </Box>
      </Container>
    </>
  );
}
