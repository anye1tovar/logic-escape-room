import React, { createContext, useCallback, useContext, useState } from "react";

type BookingModalContextType = {
  open: boolean;
  openBooking: (opts?: {
    roomId?: string;
    date?: string;
    time?: string;
  }) => void;
  closeBooking: () => void;
};

const BookingModalContext = createContext<BookingModalContextType | null>(null);

export const useBookingModal = () => {
  const ctx = useContext(BookingModalContext);
  if (!ctx) throw new Error("useBookingModal must be used within provider");
  return ctx;
};

export const BookingModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const openBooking = useCallback(
    (opts?: { roomId?: string; date?: string; time?: string }) => {
      setOpen(true);
      // we could store opts in state later if needed
    },
    []
  );
  const closeBooking = useCallback(() => setOpen(false), []);

  return (
    <BookingModalContext.Provider value={{ open, openBooking, closeBooking }}>
      {children}
    </BookingModalContext.Provider>
  );
};

export default BookingModalContext;
