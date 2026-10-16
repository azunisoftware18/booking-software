import { useQuery } from "@tanstack/react-query";
import api from "../api";

// 🔥 GET ALL TICKET TYPES
export const useTicketTypes = (placeId, allPlaces = false) => {
  return useQuery({
    queryKey: ["ticketTypes", allPlaces ? "all-places" : placeId],

    queryFn: async () => {
      const payload = {
        action: "getAll",

        data: {
          ...(placeId ? { placeId } : {}),
        },
      };

      const res = await api.post("/ticket-type/public", payload);

      return res?.data?.data;
    },

    enabled: allPlaces || !!placeId,
  });
};