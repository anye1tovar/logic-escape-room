import React from "react";
import { Container, Typography, Button, Box } from "@mui/material";
import { useSearchParams, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const BookingConfirm: React.FC = () => {
  const { t } = useTranslation();
  const [search] = useSearchParams();
  const id = search.get("id");

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom>
        {t("booking.success")}
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        ID: {id}
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button component={RouterLink} to="/" variant="contained">
          Volver al inicio
        </Button>
      </Box>
    </Container>
  );
};

export default BookingConfirm;
