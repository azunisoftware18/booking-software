import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export const useBookingLocations = () =>
  useQuery({
    queryKey: ["booking-location-options"],
    queryFn: async () => {
      const { data } = await api.get("/location/booking-options");
      return data?.data ?? [];
    },
  });
