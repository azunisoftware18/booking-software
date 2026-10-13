"use client";

import { useQuery } from "@tanstack/react-query";
import api from "../api";

export const useLocations = () => {
  return useQuery({
    queryKey: ["location"],
    queryFn: async () => {
      const { data } = await api.get("/location");
      return data?.data || data || [];
    },
  });
};
