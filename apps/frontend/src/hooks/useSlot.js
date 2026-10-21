import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const useSlots = ({ placeId, date, enabled = true }) => {
    return useQuery({
        queryKey: ["slots", placeId, date],
        queryFn: async () => {
            if (!placeId || !date) return [];
            const res = await api.get(`/slot/slots/${placeId}/${date}`);
            return res?.data?.data || [];
        },
        enabled: enabled && !!placeId && !!date,
        refetchInterval: enabled && placeId && date ? 10000 : false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });
};
