import { useQuery } from "@tanstack/react-query";
import api from "../api";

// 🔥 GET ALL TICKET TYPES
export const useTicketTypes = (
  placeId,
  allPlaces = false,
  assignedPlaces = false,
) => {
  return useQuery({
    queryKey: [
      "ticketTypes",
      allPlaces ? "all-places" : assignedPlaces ? "assigned-places" : placeId,
    ],

    queryFn: async () => {
      const payload = {
        action: "getAll",

        data: {
          ...(placeId && !assignedPlaces ? { placeId } : {}),
        },
      };

      const res = await api.post("/ticket-type/public", payload);

      return res?.data?.data;
    },

    enabled: allPlaces || assignedPlaces || !!placeId,
  });
};
