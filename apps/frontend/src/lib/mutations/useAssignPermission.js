"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";


export const updateUserPermissions = async ({
  userId,
  assignPermissionIds = [],
  removePermissionIds = [],
}) => {
  const { data } = await api.put(`/permission/user/${userId}`, {
    assignPermissionIds,
    removePermissionIds,
  });
  return data;
};

export const useAssignPermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserPermissions,
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user-permission", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["permission"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success(response?.message || "Permissions updated successfully");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to update permissions",
      );
    },
  });
};
