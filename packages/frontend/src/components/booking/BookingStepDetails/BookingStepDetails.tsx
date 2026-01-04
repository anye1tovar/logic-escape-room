import {
  Box,
  Button,
  ButtonGroup,
  ClickAwayListener,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import * as yup from "yup";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import countryDialCodes from "../../../assets/data/countryDialCodes.json";

type BookingStepDetailsProps = {
  className?: string;
  onBack?: () => void;
  onComplete?: (output: BookingDetailsFormValues) => void;
};

type CountryDialCode = {
  country: string;
  iso2: string;
  dialCode: string;
};

export type BookingDetailsFormValues = {
  fullName: string;
  email: string;
  dialCode: string;
  phone: string;
  notes: string;
  isFirstTime: boolean | null;
};

export default function BookingStepDetails({
  className,
  onBack,
  onComplete,
}: BookingStepDetailsProps) {
  const dialCodes = countryDialCodes as CountryDialCode[];
  const [isEmailTooltipOpen, setIsEmailTooltipOpen] = useState(false);

  const validationSchema = useMemo(
    () =>
      yup.object({
        fullName: yup
          .string()
          .trim()
          .required("El nombre completo es requerido."),
        email: yup
          .string()
          .trim()
          .email("Ingresa un correo válido.")
          .required("El correo es requerido."),
        dialCode: yup.string().trim().required("El indicativo es requerido."),
        phone: yup
          .string()
          .trim()
          .matches(/^\d+$/, "El teléfono debe contener solo números.")
          .required("El teléfono es requerido."),
        notes: yup.string().trim().notRequired(),
        isFirstTime: yup
          .boolean()
          .nullable()
          .required("Selecciona sí o no para continuar."),
      }),
    []
  );

  const [values, setValues] = useState<BookingDetailsFormValues>({
    fullName: "",
    email: "",
    dialCode: "+57",
    phone: "",
    notes: "",
    isFirstTime: null,
  });

  const [touched, setTouched] = useState<
    Partial<Record<keyof BookingDetailsFormValues, boolean>>
  >({});
  const [errors, setErrors] = useState<
    Partial<Record<keyof BookingDetailsFormValues, string>>
  >({});

  const validateField = async (field: keyof BookingDetailsFormValues) => {
    try {
      await validationSchema.validateAt(field, values);
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setErrors((prev) => ({ ...prev, [field]: error.message }));
      }
    }
  };

  const validateForm = async () => {
    try {
      await validationSchema.validate(values, { abortEarly: false });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const nextErrors: Partial<
          Record<keyof BookingDetailsFormValues, string>
        > = {};
        for (const issue of error.inner) {
          const path = issue.path as keyof BookingDetailsFormValues | undefined;
          if (path && !nextErrors[path]) nextErrors[path] = issue.message;
        }
        setErrors(nextErrors);
      }
      return false;
    }
  };

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
        <Box
          component="form"
          id="booking-step-details-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setTouched({
              fullName: true,
              email: true,
              dialCode: true,
              phone: true,
              notes: true,
              isFirstTime: true,
            });
            const isValid = await validateForm();
            if (isValid) onComplete?.(values);
          }}
          noValidate
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre completo"
                placeholder="Tu nombre y apellido"
                fullWidth
                variant="outlined"
                value={values.fullName}
                onChange={(event) => {
                  const fullName = event.target.value;
                  setValues((prev) => ({ ...prev, fullName }));
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, fullName: true }));
                  void validateField("fullName");
                }}
                error={Boolean(touched.fullName && errors.fullName)}
                helperText={touched.fullName ? errors.fullName : undefined}
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
                value={values.email}
                onChange={(event) => {
                  const email = event.target.value;
                  setValues((prev) => ({ ...prev, email }));
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, email: true }));
                  void validateField("email");
                }}
                error={Boolean(touched.email && errors.email)}
                helperText={touched.email ? errors.email : undefined}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <ClickAwayListener
                        onClickAway={() => setIsEmailTooltipOpen(false)}
                      >
                        <Tooltip
                          title="Usaremos tu correo para enviarte la confirmación de tu reserva y para invitarte al evento en Google Calendar."
                          arrow
                          open={isEmailTooltipOpen}
                          onClose={() => setIsEmailTooltipOpen(false)}
                          disableHoverListener
                          disableFocusListener
                          disableTouchListener
                        >
                          <IconButton
                            aria-label="Información del correo"
                            size="small"
                            onClick={() =>
                              setIsEmailTooltipOpen((prev) => !prev)
                            }
                            edge="end"
                          >
                            <InfoOutlinedIcon
                              fontSize="small"
                              sx={{ color: "rgba(255,255,255,0.75)" }}
                            />
                          </IconButton>
                        </Tooltip>
                      </ClickAwayListener>
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{ sx: labelSx }}
                sx={fieldSx}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                className="booking-form__phone"
                aria-label="Número de contacto"
              >
                <FormControl
                  fullWidth
                  variant="outlined"
                  sx={fieldSx}
                  error={Boolean(touched.dialCode && errors.dialCode)}
                >
                  <InputLabel id="booking-dial-code-label" sx={labelSx}>
                    Indicativo
                  </InputLabel>
                  <Select
                    labelId="booking-dial-code-label"
                    id="booking-dial-code"
                    label="Indicativo"
                    value={values.dialCode}
                    onChange={(event) => {
                      const dialCode = String(event.target.value);
                      setValues((prev) => ({ ...prev, dialCode }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, dialCode: true }));
                      void validateField("dialCode");
                    }}
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
                  {touched.dialCode && errors.dialCode && (
                    <FormHelperText>{errors.dialCode}</FormHelperText>
                  )}
                </FormControl>

                <TextField
                  label="Número"
                  type="tel"
                  fullWidth
                  variant="outlined"
                  value={values.phone}
                  onChange={(event) => {
                    const phone = event.target.value.replace(/[^\d]/g, "");
                    setValues((prev) => ({ ...prev, phone }));
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, phone: true }));
                    void validateField("phone");
                  }}
                  error={Boolean(touched.phone && errors.phone)}
                  helperText={touched.phone ? errors.phone : undefined}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  className="booking-form__phone-number"
                  InputLabelProps={{ sx: labelSx }}
                  sx={fieldSx}
                />
              </Box>

              <Typography variant="caption">
                Usaremos este número para escribirte por WhatsApp si es
                necesario.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl
                error={Boolean(touched.isFirstTime && errors.isFirstTime)}
                fullWidth
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <p
                    className="booking-form__hint"
                    style={{ margin: 0, maxWidth: "50%" }}
                  >
                    ¿Es tu primera vez en Logic Escape Room?
                  </p>

                  <ButtonGroup
                    variant="outlined"
                    aria-label="Primera vez en Logic Escape Room"
                    sx={{
                      gap: 1,
                      "& .MuiButton-root": {
                        borderColor: "rgba(255,255,255,0.18)",
                        color: "rgba(255,255,255,0.9)",
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: "12px",
                        padding: "0.55rem 1.1rem",
                        background: "rgba(255,255,255,0.03)",
                      },
                      "& .MuiButton-root:hover": {
                        borderColor: "rgba(255,255,255,0.28)",
                        background: "rgba(255,255,255,0.06)",
                      },
                    }}
                  >
                    <Button
                      type="button"
                      variant={
                        values.isFirstTime === true ? "contained" : "outlined"
                      }
                      onClick={() => {
                        setValues((prev) => ({ ...prev, isFirstTime: true }));
                        setTouched((prev) => ({ ...prev, isFirstTime: true }));
                      }}
                      sx={{
                        background:
                          values.isFirstTime === true
                            ? "linear-gradient(135deg, #efbb3d, #cbabff) !important"
                            : undefined,
                      }}
                    >
                      Sí
                    </Button>
                    <Button
                      type="button"
                      variant={
                        values.isFirstTime === false ? "contained" : "outlined"
                      }
                      onClick={() => {
                        setValues((prev) => ({ ...prev, isFirstTime: false }));
                        setTouched((prev) => ({ ...prev, isFirstTime: true }));
                      }}
                      sx={{
                        background:
                          values.isFirstTime === false
                            ? "linear-gradient(135deg, #efbb3d, #cbabff) !important"
                            : undefined,
                      }}
                    >
                      No
                    </Button>
                  </ButtonGroup>
                </Box>

                {touched.isFirstTime && errors.isFirstTime && (
                  <FormHelperText>{errors.isFirstTime}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        <Box>
          <Typography variant="h5" mb={1}>
            Notas
          </Typography>
          <TextField
            placeholder="Cumpleaños, accesibilidad, claustrofobia, etc."
            fullWidth
            multiline
            minRows={2}
            value={values.notes}
            onChange={(event) => {
              const notes = event.target.value;
              setValues((prev) => ({ ...prev, notes }));
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, notes: true }));
              void validateField("notes");
            }}
            error={Boolean(touched.notes && errors.notes)}
            helperText={touched.notes ? errors.notes : undefined}
            InputLabelProps={{ sx: labelSx }}
            sx={fieldSx}
          />
        </Box>
      </div>

      <footer className="booking-step__footer booking-step__footer--split">
        <button
          type="button"
          className="booking-actions__button booking-actions__button--ghost"
          onClick={onBack}
          disabled={!onBack}
        >
          Volver
        </button>
        <button
          type="submit"
          form="booking-step-details-form"
          className="booking-actions__button"
        >
          Continuar
        </button>
      </footer>
    </section>
  );
}
