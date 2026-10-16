import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

// 🔥 HANDLE CREATE / UPDATE / DELETE
export const useHandleTicketType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/ticket-type", payload);

      return res?.data?.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ticketTypes"],
      });
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });
};