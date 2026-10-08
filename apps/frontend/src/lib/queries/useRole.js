import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export const useRoles = (placeId) => {
  return useQuery({
    queryKey: ["role", placeId],
    queryFn: async () => {
      const { data } = await api.get("/role");
      // Backend response format: { success: true, data: [...] }
      return data?.data || [];
    },
    enabled: true, // Agar placeId optional hai toh true rakhein
  });
};