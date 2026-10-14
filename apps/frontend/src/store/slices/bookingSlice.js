import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    date: new Date().toISOString().split("T")[0],
    slot: null,
    tickets: {},
    visitorInfo: {
        name: "",
        email: "",
        phone: "",
    },
    totalAmount: 0,
};

const bookingSlice = createSlice({
    name: "booking",
    initialState,

    reducers: {
        setDate: (state, action) => {
            state.date = action.payload;
        },

        setSlot: (state, action) => {
            state.slot = action.payload;
        },

        setTickets: (state, action) => {
            state.tickets = action.payload;
        },

        setVisitorInfo: (state, action) => {
            state.visitorInfo = action.payload;
        },

        setTotalAmount: (state, action) => {
            state.totalAmount = action.payload;
        },
        resetBooking: () => initialState,
    },
});

export const {
    setDate,
    setSlot,
    setTickets,
    setVisitorInfo,
    setTotalAmount,
    resetBooking,
} = bookingSlice.actions;

export default bookingSlice.reducer;