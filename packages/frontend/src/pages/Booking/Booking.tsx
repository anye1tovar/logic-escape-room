import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Container,
  Dialog,
  DialogContent,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createBooking, fetchBookings } from "../../api/bookings";
import { fetchRooms } from "../../api/rooms";
import "./Booking.scss";

type Room = {
  id: string;
  name: string;
  image: string;
  video?: string;
  age?: string;
  minAge?: string;
  difficulty?: string;
  players?: string;
  duration?: string;
  description?: string;
};

// Rooms are loaded from the backend via /api/rooms

function generateTimeSlots() {
  // generate slots every 90 minutes (1h30) from 14:00 to 21:30 inclusive
  const slots: string[] = [];
  const start = new Date();
  start.setHours(14, 0, 0, 0);
  const end = new Date();
  end.setHours(21, 30, 0, 0);

  const slotMs = 90 * 60 * 1000; // 90 minutes in ms
  for (let t = start.getTime(); t <= end.getTime(); t += slotMs) {
    const d = new Date(t);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

type BookingProps = {
  onCreated?: (booking: any) => void;
};

const Booking = ({ onCreated }: BookingProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    t("booking.step1"),
    t("booking.step2"),
    t("booking.step3"),
    t("booking.step4"),
  ];

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const [date, setDate] = useState(todayStr);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<number>(2);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sendReceipt, setSendReceipt] = useState(true);

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);

  const [previewRoom, setPreviewRoom] = useState<Room | null>(null);

  useEffect(() => {
    loadBookings();
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBookings() {
    try {
      const data = await fetchBookings();
      setBookings(data);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function loadRooms() {
    try {
      const rooms = await fetchRooms();
      // map rooms into ROOMS-like structure
      // if no image/video provided upstream uses seeded values
      if (rooms && rooms.length) {
        setPreviewRoom(null);
        setRooms(rooms);
        setSelectedRoom(rooms[0]);
      }
    } catch (e: any) {
      console.error("Failed to load rooms", e);
    }
  }

  function occupiedSlotsFor(roomId: string, dateStr: string) {
    return bookings
      .filter((b) => b.roomId === roomId && b.date === dateStr)
      .map((b) => b.time);
  }

  function isDateBeforeToday(d: string) {
    const sel = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sel < today;
  }

  function handleNext() {
    if (activeStep === 0) {
      if (!date || isDateBeforeToday(date)) {
        setError(t("booking.selectDate") + " - " + t("booking.error"));
        return;
      }
      if (!selectedRoom || !time) {
        setError(t("booking.selectRoom") + " / " + t("booking.selectTime"));
        return;
      }
    }
    if (activeStep === 2) {
      if (!firstName || !lastName || !email) {
        setError(t("booking.error"));
        return;
      }
    }
    setError(null);
    setActiveStep((s) => s + 1);
  }

  function handleBack() {
    setActiveStep((s) => s - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email,
        whatsapp,
        roomId: selectedRoom?.id,
        time,
        attendees,
        sendReceipt,
        date,
      };
      const res = await createBooking(payload);
      setSuccess(res);
      // refresh bookings to reflect occupied slot
      await loadBookings();
      if (onCreated) {
        onCreated(res);
      } else {
        setActiveStep((s) => s + 1);
        navigate(`/booking/confirm?id=${res.id}`);
      }
    } catch (e: any) {
      setError(e.message || t("booking.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="md" className="booking-page__container">
      <Typography variant="h4" gutterBottom>
        {t("booking.title")}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {t("booking.intro")}
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t("booking.success")}
        </Alert>
      )}

      {activeStep === 0 && (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label={t("booking.selectDate")}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                inputProps={{ min: todayStr }}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <Typography variant="subtitle1">
                {t("booking.selectRoom")}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {rooms.length > 0 ? (
                  rooms.map((room) => (
                    <Grid item xs={12} sm={6} key={room.id}>
                      <Card>
                        <CardMedia
                          component="img"
                          height="140"
                          image={room.image}
                          alt={room.name}
                          onClick={() => setPreviewRoom(room)}
                          style={{ cursor: "pointer" }}
                        />
                        <CardContent>
                          <Typography variant="h6">{room.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {room.description}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <RadioGroup
                              value={
                                selectedRoom?.id === room.id ? time || "" : ""
                              }
                              onChange={(e) => {
                                setSelectedRoom(room);
                                setTime(e.target.value);
                              }}
                            >
                              <Grid container spacing={1}>
                                {TIME_SLOTS.map((slot) => {
                                  const occupied = occupiedSlotsFor(
                                    room.id,
                                    date
                                  ).includes(slot);
                                  return (
                                    <Grid item key={slot} xs={6} sm={4}>
                                      <FormControlLabel
                                        value={slot}
                                        control={<Radio disabled={occupied} />}
                                        label={
                                          <Typography
                                            variant="caption"
                                            color={
                                              occupied
                                                ? "text.disabled"
                                                : "text.primary"
                                            }
                                          >
                                            {slot}
                                          </Typography>
                                        }
                                        onClick={() => {
                                          if (!occupied) {
                                            setSelectedRoom(room);
                                            setTime(slot);
                                          }
                                        }}
                                      />
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </RadioGroup>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Typography>Cargando salas...</Typography>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={handleNext}>
              {t("booking.step2")}
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 1 && (
        <Box>
          <Typography variant="h6">{t("booking.guests")}</Typography>
          <Box sx={{ width: 200, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="attendees-label">
                {t("booking.guests")}
              </InputLabel>
              <Select
                labelId="attendees-label"
                value={attendees}
                label={t("booking.guests")}
                onChange={(e) => setAttendees(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t("booking.firstName")}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t("booking.lastName")}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t("booking.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={t("booking.whatsapp")}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 3 && (
        <Box>
          <Typography variant="h6">{t("booking.step4")}</Typography>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography>
              <strong>Room:</strong> {selectedRoom?.name}
            </Typography>
            <Typography>
              <strong>Date:</strong> {date}
            </Typography>
            <Typography>
              <strong>Time:</strong> {time}
            </Typography>
            <Typography>
              <strong>Attendees:</strong> {attendees}
            </Typography>
            <Typography>
              <strong>Name:</strong> {firstName} {lastName}
            </Typography>
            <Typography>
              <strong>Email:</strong> {email}
            </Typography>
            <FormControlLabel
              control={
                <Radio
                  checked={sendReceipt}
                  onChange={() => setSendReceipt((s) => !s)}
                />
              }
              label={t("booking.sendReceipt")}
            />
          </Stack>

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {t("booking.submit")}
            </Button>
          </Box>
        </Box>
      )}

      {/* Preview dialog for room */}
      <Dialog
        fullScreen
        open={!!previewRoom}
        onClose={() => setPreviewRoom(null)}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ position: "relative" }}>
            <IconButton
              sx={{ position: "absolute", top: 16, right: 16, color: "#fff" }}
              onClick={() => setPreviewRoom(null)}
            >
              <CloseIcon />
            </IconButton>
            {previewRoom && (
              <Box>
                <Box
                  component="img"
                  src={previewRoom.image}
                  alt={previewRoom.name}
                  sx={{ width: "100%", height: "60vh", objectFit: "cover" }}
                />
                <Box sx={{ p: 3 }}>
                  <Typography variant="h4">{previewRoom.name}</Typography>
                  <Box sx={{ mt: 2 }}>
                    <iframe
                      width="100%"
                      height="400"
                      src={previewRoom.video}
                      title={previewRoom.name}
                      frameBorder="0"
                      allowFullScreen
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography>
                      Restricción de Edad:{" "}
                      {previewRoom.minAge || previewRoom.age}
                    </Typography>
                    <Typography>
                      Dificultad: {previewRoom.difficulty}
                    </Typography>
                    <Typography>
                      Nº de jugadores: {previewRoom.players}
                    </Typography>
                    <Typography>Duración: {previewRoom.duration}</Typography>
                    <Typography sx={{ mt: 1 }}>
                      {previewRoom.description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Booking;
