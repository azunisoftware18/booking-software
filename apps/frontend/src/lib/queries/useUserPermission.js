"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";


export const fetchUserPermissions = async (userId) => {
  const { data } = await api.get(`/permission/user/${userId}`);
  return data?.data?.permissions ?? [];
};


export const useUserPermissions = (userId, options = {}) => {
  return useQuery({
    queryKey: ["user-permission", userId],
    queryFn: () => fetchUserPermissions(userId),
    enabled: Boolean(userId),
    ...options,
  });
};
