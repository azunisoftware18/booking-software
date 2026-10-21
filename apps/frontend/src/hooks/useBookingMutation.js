import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export const useBookingMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post("/booking", payload);
            return data;
        },
        onSuccess: (_, payload) => {
            if (payload?.placeId) {
                queryClient.invalidateQueries({
                    queryKey: ["slots", payload.placeId],
                });
            }
        },
        onError: (error) => {
            console.error(
                "Booking Submission Error:",
                error?.response?.data || error?.message || error
            );
        },
    });
};
    
