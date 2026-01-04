import { createTheme } from "@mui/material/styles";

const headingFamily = '"Bebas Neue", "Impact", "Arial Narrow", sans-serif';
const bodyFamily = '"Indie Flower", "Comic Sans MS", "Segoe UI", cursive';

const theme = createTheme({
  typography: {
    fontFamily: bodyFamily,
    body1: {
      fontFamily: bodyFamily,
      fontWeight: 400,
      lineHeight: 1.6,
      fontSize: "1.05rem",
    },
    body2: {
      fontFamily: bodyFamily,
      fontWeight: 400,
      lineHeight: 1.6,
    },
    button: {
      fontFamily: bodyFamily,
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: "0.04em",
    },
    h1: {
      fontFamily: headingFamily,
      fontWeight: 400,
    },
    h2: {
      fontFamily: headingFamily,
      fontWeight: 400,
    },
    h3: {
      fontFamily: headingFamily,
      fontWeight: 400,
    },
    h4: {
      fontFamily: headingFamily,
      fontWeight: 400,
      color: "#fff",
      fontSize: "3.5rem",
    },
    h5: {
      fontFamily: headingFamily,
      fontWeight: 400,
      fontSize: "2rem",
    },
    h6: {
      fontFamily: headingFamily,
      fontWeight: 400,
      fontSize: "1.5rem",
    },
  },
});

export default theme;
