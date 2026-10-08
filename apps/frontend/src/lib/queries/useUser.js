// frontend/src/lib/queries/useUser.js
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export const useUsers = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await api.get("/user");
      // Backend response: { success: true, data: [...] }
      return data?.data || [];
    },
  });
};