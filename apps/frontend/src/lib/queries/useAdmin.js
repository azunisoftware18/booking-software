"use client";

import { useQuery } from "@tanstack/react-query";
import api from "../api";

const fetchAdmins = async () => {
  const { data } = await api.get("/admin/all");
  return data.data || [];
};

export const useAdmins = () => {
  return useQuery({
    queryKey: ["admin"],
    queryFn: fetchAdmins,
    staleTime: 0,
  });
};
