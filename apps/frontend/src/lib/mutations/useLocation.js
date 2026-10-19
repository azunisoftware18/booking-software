"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

const isUploadFile = (value) =>
  value && typeof value === "object" && typeof value.size === "number";

export const useHandleLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, data }) => {
      if (action === "create") {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key !== "image" && value != null) formData.append(key, value);
        });
        if (isUploadFile(data.image)) formData.append("image", data.image);
        const response = await api.post("/location", formData);
        return response.data;
      }

      if (action === "update") {
        const { id, ...locationData } = data;
        const formData = new FormData();
        Object.entries(locationData).forEach(([key, value]) => {
          if (key !== "image" && value != null) formData.append(key, value);
        });
        if (isUploadFile(locationData.image)) {
          formData.append("image", locationData.image);
        }
        const response = await api.patch(`/location/${id}`, formData);
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
