"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

export const useHandleLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, data }) => {
      if (action === "create") {
        const response = await api.post("/location", data);
        return response.data;
      }

      if (action === "update") {
        const { id, ...locationData } = data;
        const response = await api.patch(`/location/${id}`, locationData);
        return response.data;
      }

      if (action === "delete") {
        const response = await api.delete(`/location/${data.id}`);
        return response.data;
      }

      throw new Error(`Unsupported location action: ${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location"] });
    },
  });
};
