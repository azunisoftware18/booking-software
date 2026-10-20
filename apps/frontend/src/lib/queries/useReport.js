import { useQuery } from "@tanstack/react-query";
import api from "../api";

export const useAnalyticsReport = (filters) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return useQuery({
    queryKey: ["analytics-report", filters],
    queryFn: async () => {
      const res = await api.get(`/report/analytics?${params.toString()}`);
      return res?.data?.data;
    },
  });
};
