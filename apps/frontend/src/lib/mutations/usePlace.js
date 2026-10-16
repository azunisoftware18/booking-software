// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import api from "../api";

// // 🔹 CREATE PLACE
// export const useCreatePlace = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (payload) => {
//       const res = await api.post("/place", payload);
//       return res?.data?.data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["places"] });
//     },
//   });
// };

// // 🔹 UPDATE PLACE
// export const useUpdatePlace = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async ({ id, payload }) => {
//       const res = await api.put(`/place/${id}`, payload);
//       return res?.data?.data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["places"] });
//     },
//   });
// };

// // 🔹 DELETE PLACE
// export const useDeletePlace = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (id) => {
//       await api.delete(`/place/${id}`);
//       return id;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["places"] });
//     },
//   });
// };



import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

// ============================================
// CREATE PLACE
// ============================================
export const useCreatePlace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const formData = new FormData();

      formData.append("annexure", payload.annexure);
      formData.append("annexureOption", payload.annexureOption);
      formData.append("rate4Hours", String(payload.rate4Hours ?? ""));
      formData.append("rate8Hours", String(payload.rate8Hours ?? ""));
      formData.append("ratePerPerson", String(payload.ratePerPerson ?? ""));
      formData.append("ratePerStudent", String(payload.ratePerStudent ?? ""));
      formData.append("name", payload.name);
      formData.append("location", payload.location);
      formData.append("latitude", String(payload.latitude));
      formData.append("longitude", String(payload.longitude));
      formData.append("shortDescription",payload.shortDescription || "");
      formData.append(
        "description",
        payload.description || ""
      );

      if (payload.slotTemplates?.length) {
        formData.append("slotTemplates", JSON.stringify(payload.slotTemplates));
      }

      // New image
      if (payload.image instanceof File) {
        formData.append("image", payload.image);
      }

      const res = await api.post("/place", formData);

      return res?.data?.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["places"],
      });
    },
  });
};

// ============================================
// UPDATE PLACE
// ============================================
export const useUpdatePlace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const formData = new FormData();

      formData.append("annexure", payload.annexure);
      formData.append("annexureOption", payload.annexureOption);
      formData.append("rate4Hours", String(payload.rate4Hours ?? ""));
      formData.append("rate8Hours", String(payload.rate8Hours ?? ""));
      formData.append("ratePerPerson", String(payload.ratePerPerson ?? ""));
      formData.append("ratePerStudent", String(payload.ratePerStudent ?? ""));
      formData.append("name", payload.name);
      formData.append("location", payload.location);
      formData.append("latitude", String(payload.latitude));
      formData.append("longitude", String(payload.longitude));
      formData.append(
        "shortDescription",
        payload.shortDescription || ""
      );
      formData.append(
        "description",
        payload.description || ""
      );

      // Only send image when user selected a NEW image
      if (payload.image instanceof File) {
        formData.append("image", payload.image);
      }

      const res = await api.put(
        `/place/${id}`,
        formData
      );

      return res?.data?.data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["places"],
      });

      queryClient.invalidateQueries({
        queryKey: ["place", variables.id],
      });
    },
  });
};

// ============================================
// DELETE PLACE
// ============================================
export const useDeletePlace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/place/${id}`);
      return id;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["places"],
      });
    },
  });
};