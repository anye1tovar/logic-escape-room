import React from "react";
import Dialog from "@mui/material/Dialog";
import { useBookingModal } from "../../contexts/BookingModalContext";
import Booking from "../../pages/Booking/Booking";
import { useNavigate } from "react-router-dom";

const BookingModal: React.FC = () => {
  const { open, closeBooking } = useBookingModal();
  const navigate = useNavigate();

  function handleCreated(booking: any) {
    closeBooking();
    if (booking && booking.id) {
      navigate(`/booking/confirm?id=${booking.id}`);
    }
  }

  return (
    <Dialog open={open} onClose={closeBooking} fullWidth maxWidth="md">
      <Booking onCreated={handleCreated} />
    </Dialog>
  );
};

export default BookingModal;
