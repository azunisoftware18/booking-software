// frontend/src/lib/mutations/useUser.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export const useHandleUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, data }) => {
      if (action === "create") {
        const res = await api.post("/user", data);
        return res.data;
      }
      if (action === "update") {
        const { id, ...rest } = data;
        const res = await api.put(`/user/${id}`, rest);
        return res.data;
      }
      if (action === "delete") {
        const res = await api.delete(`/user/${data.id}`);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};