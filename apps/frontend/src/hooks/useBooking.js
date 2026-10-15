'use client';

import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

export const useBookings = () => {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const res = await api.get("/booking/all");

      return res?.data?.data;
    },
  });
};

export const useBookingById = (id, receiptToken) => {
  return useQuery({
    queryKey: ["booking", id, receiptToken],
    queryFn: async () => {
      const res = receiptToken
        ? await api.get(`/booking/receipt/${id}`, {
            params: { receiptToken },
          })
        : await api.get(`/booking/${id}`);

      return res?.data?.data;
    },

    enabled: !!id,
  });
};