import { createTheme } from "@mui/material/styles";

const headingFamily = '"Bebas Neue", "Impact", "Arial Narrow", sans-serif';
const bodyFamily = '"Inter", "InterDisplay", "Segoe UI", cursive';

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#cbabff" },
    secondary: { main: "#efbb3d" },
    error: { main: "#ffb4b4" },
    background: {
      default: "#110a26",
      paper: "#0f172a",
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.85)",
    },
  },
  shape: {
    borderRadius: 12,
  },
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
      fontSize: "1.8rem",
    },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 900,
          textTransform: "none",
        },
        contained: {
          background: "linear-gradient(135deg, #cbabff, #efbb3d)",
          color: "#0b1020",
        },
        outlined: {
          borderColor: "rgba(255, 255, 255, 0.18)",
          color: "#ffffff",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          background: "rgba(255, 255, 255, 0.04)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.12)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(203, 171, 255, 0.6)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(203, 171, 255, 0.85)",
          },
          "&.Mui-focused": {
            boxShadow: "0 0 0 3px rgba(203, 171, 255, 0.18)",
          },
        },
        input: {
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "rgba(255, 255, 255, 0.78)",
          "&.Mui-focused": {
            color: "#cbabff",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: "rgba(255, 255, 255, 0.85)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundImage: "none",
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0f172a",
          backdropFilter: "none",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0f172a",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        },
        head: {
          fontWeight: 900,
          letterSpacing: "0.02em",
          background: "rgba(15, 23, 42, 0.35)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(15, 23, 42, 0.45)",
        },
        standardError: {
          borderColor: "rgba(255, 180, 180, 0.5)",
          color: "#ffb4b4",
        },
        standardSuccess: {
          borderColor: "rgba(239, 187, 61, 0.5)",
          color: "#ffe6a3",
        },
      },
    },
  },
});

export default theme;
