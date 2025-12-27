import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

import countryDialCodes from "../../../assets/data/countryDialCodes.json";

type BookingStepDetailsProps = {
  className?: string;
};

type CountryDialCode = {
  country: string;
  iso2: string;
  dialCode: string;
};

export default function BookingStepDetails({
  className,
}: BookingStepDetailsProps) {
  const dialCodes = countryDialCodes as CountryDialCode[];

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      background: "rgba(255,255,255,0.04)",
      color: "#fff",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255,255,255,0.12)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(255,255,255,0.22)",
    },
  } as const;

  const labelSx = { color: "rgba(255,255,255,0.85)" } as const;

  return (
    <section className={className}>
      <header className="booking-step__header">
        <h2 className="booking-step__title">2. Datos</h2>
        <p className="booking-step__subtitle">
          Cuéntanos quién reserva y cómo podemos contactarte.
        </p>
      </header>

      <div className="booking-step__content">
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre completo"
                placeholder="Tu nombre y apellido"
                fullWidth
                variant="outlined"
                InputLabelProps={{ sx: labelSx }}
                sx={fieldSx}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Correo"
                placeholder="tucorreo@ejemplo.com"
                type="email"
                fullWidth
                variant="outlined"
                InputLabelProps={{ sx: labelSx }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                className="booking-form__phone"
                aria-label="Número de contacto"
              >
                <FormControl fullWidth variant="outlined" sx={fieldSx}>
                  <InputLabel sx={labelSx}>Indicativo</InputLabel>
                  <Select
                    label="Indicativo"
                    defaultValue="+57"
                    className="booking-form__phone-code"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          background:
                            "linear-gradient(135deg, rgba(17,10,38,0.98), rgba(19,9,44,0.92))",
                          border: "1px solid rgba(203,171,255,0.22)",
                          color: "#fff",
                        },
                      },
                    }}
                  >
                    {dialCodes.map((item) => (
                      <MenuItem
                        key={`${item.iso2}-${item.dialCode}`}
                        value={item.dialCode}
                      >
                        {item.iso2} {item.dialCode}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Número"
                  type="tel"
                  fullWidth
                  variant="outlined"
                  inputProps={{ inputMode: "tel" }}
                  className="booking-form__phone-number"
                  InputLabelProps={{ sx: labelSx }}
                  sx={fieldSx}
                />
              </Box>

              <p className="booking-form__hint booking-form__hint--inline">
                Usaremos este número para escribirte por WhatsApp si es
                necesario.
              </p>
            </Grid>
          </Grid>
        </Box>

        <div className="booking-form__section">
          <h3 className="booking-form__section-title">Notas</h3>
          <TextField
            placeholder="Cumpleaños, accesibilidad, claustrofobia, etc."
            fullWidth
            multiline
            minRows={4}
            InputLabelProps={{ sx: labelSx }}
            sx={fieldSx}
          />
        </div>
      </div>

      <footer className="booking-step__footer booking-step__footer--split">
        <button
          type="button"
          className="booking-actions__button booking-actions__button--ghost"
          disabled
        >
          Volver
        </button>
        <button type="button" className="booking-actions__button" disabled>
          Continuar
        </button>
      </footer>
    </section>
  );
}
