import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import api from "../api";

// 🔹 GET ALL PLACES
export const usePlaces = () => {
  const userId = useSelector((state) => state.auth.user?.id);

  return useQuery({
    queryKey: ["places", userId ?? null],
    queryFn: async () => {
      const res = await api.get("/place");
      return res?.data?.data || [];
    },
  });
};

// 🔹 GET PLACE BY ID
export const usePlaceById = (id) => {
  const userId = useSelector((state) => state.auth.user?.id);

  return useQuery({
    queryKey: ["place", id, userId ?? null],
    queryFn: async () => {
      const res = await api.get(`/place/${id}`);
      return res?.data?.data;
    },
    enabled: !!id,
  });
};