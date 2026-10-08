
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export const useHandleRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, data }) => {
      if (action === "create") {
        const res = await api.post("/role", data);
        return res.data;
      }
      if (action === "update") {
        const { id, ...rest } = data;
        const res = await api.put(`/role/${id}`, rest);
        return res.data;
      }
      if (action === "delete") {
        const res = await api.delete(`/role/${data.id}`);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role"] });
    },
  });
};