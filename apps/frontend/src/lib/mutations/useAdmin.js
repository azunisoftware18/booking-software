"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

const createAdminApi = async (adminData) => {
  const { data } = await api.post("/admin/create", adminData);
  return data;
};

const updateAdminApi = async ({ id, ...adminData }) => {
  const { data } = await api.patch(`/admin/${id}`, adminData);
  return data;
};

const deleteAdminApi = async (id) => {
  const { data } = await api.delete(`/admin/${id}`);
  return data;
};

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

export const useUpdateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

export const useDeleteAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};
