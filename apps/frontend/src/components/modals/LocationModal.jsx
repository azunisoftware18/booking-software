"use client";

import { Image as ImageIcon, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export default function LocationModal({ open, onClose, onSubmit, defaultValues }) {
  const [preview, setPreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      email: "",
      contactNumber: "",
      description: "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name || "",
        address: defaultValues.address || "",
        city: defaultValues.city || "",
        state: defaultValues.state || "",
        email: defaultValues.email || "",
        contactNumber: defaultValues.contactNumber || "",
        description: defaultValues.description || "",
        image: null,
      });
    } else {
      reset({
        name: "",
        address: "",
        city: "",
        state: "",
        email: "",
        contactNumber: "",
        description: "",
        image: null,
      });
    }
    // The modal is kept mounted between create/edit operations, so reset the
    // local upload state when its input record changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(defaultValues?.imageUrl || null);
    setImageError("");
  }, [defaultValues, reset, open]);

  if (!open) return null;

  const submitHandler = async (data) => {
    await onSubmit(data);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setImageError("Please select a PNG, JPG, JPEG or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }
    setValue("image", file, { shouldDirty: true });
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {defaultValues ? "Edit Location" : "Add New Location"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Fill in the details below.
          </p>
        </div>

        <form onSubmit={handleSubmit(submitHandler)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Location Name *
            </label>
            <input
              {...register("name", {
                required: "Name is required",
                minLength: {
                  value: 2,
                  message: "Location name must be at least 2 characters",
                },
              })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g. Main Auditorium"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Location Image
            </label>
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-3">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Location preview"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setValue("image", null, { shouldDirty: true });
                    }}
                    className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow"
                    aria-label="Remove location image"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="location-image"
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center text-slate-500 hover:bg-slate-50"
                >
                  <ImageIcon className="mb-2 h-7 w-7" />
                  <span className="text-sm font-medium">Upload image</span>
                  <span className="text-xs">PNG, JPG or WEBP · Max 5 MB</span>
                </label>
              )}
              <input
                id="location-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                {...register("image")}
                onChange={(event) => {
                  handleImageChange(event);
                }}
              />
              {preview && (
                <label
                  htmlFor="location-image"
                  className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <Upload className="h-4 w-4" /> Change image
                </label>
              )}
            </div>
            {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              City
            </label>
            <input
              {...register("city")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g. Jaipur"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address
            </label>
            <input
              {...register("address")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Full address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              maxLength={191}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g. contact@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contact Number
            </label>
            <input
              {...register("contactNumber")}
              type="tel"
              maxLength={10}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              State
            </label>
            <input
              {...register("state")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="e.g. Rajasthan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              placeholder="Short description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : defaultValues
                ? "Update Location"
                : "Create Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
