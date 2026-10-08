// frontend/src/components/modals/RoleModal.jsx
"use client";

import React, { useEffect, useState } from "react";
import { X, MapPin } from "lucide-react";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import TextareaField from "@/components/ui/TextareaField";
import { usePlaces } from "@/lib/queries/usePlace";

const defaultForm = {
  roleName: "",
  roleCode: "",
  placeId: "",
  description: "",
};

export default function RoleModal({ open, onClose, onSubmit, defaultValues }) {
  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  // 👇 Database se Places fetch karein
  const { data: places = [], isLoading: placesLoading } = usePlaces();

  useEffect(() => {
    if (defaultValues) {
      setFormData({
        roleName: defaultValues.roleName || "",
        roleCode: defaultValues.roleCode || "",
        placeId: defaultValues.placeId || defaultValues.place?.id || "",
        description: defaultValues.description || "",
      });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  }, [defaultValues, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.roleName.trim()) newErrors.roleName = "Role name is required";
    if (!formData.roleCode.trim()) newErrors.roleCode = "Role code is required";
    if (formData.description.length > 500)
      newErrors.description = "Description cannot exceed 500 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSubmit({
      roleName: formData.roleName.trim(),
      roleCode: formData.roleCode.trim().toUpperCase(),
      placeId: formData.placeId, // 👈 Single place ID
      description: formData.description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-145 overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {defaultValues ? "Edit Role" : "Add New Role"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {defaultValues
                ? "Update role information."
                : "Create a new role for your system."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={19} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {/* Role Name */}
            <InputField
              label="Role Name *"
              name="roleName"
              value={formData.roleName}
              onChange={handleChange}
              placeholder="e.g. Booking Manager"
              error={errors.roleName}
            />

            {/* Role Code */}
            <InputField
              label="Role Code *"
              name="roleCode"
              value={formData.roleCode}
              onChange={handleChange}
              placeholder="e.g. BOOKING_MANAGER"
              error={errors.roleCode}
            />

            {/* Place - Dynamic from DB */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Place{" "}
                <span className="font-normal text-gray-400">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
                />
                <select
                  name="placeId"
                  value={formData.placeId}
                  onChange={handleChange}
                  disabled={placesLoading}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                >
                  <option value="">
                    {placesLoading ? "Loading places..." : "Select Place"}
                  </option>
                  {Array.isArray(places) &&
                    places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name || "Unnamed Place"}
                      </option>
                    ))}
                </select>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Select the place this role is associated with.
              </p>
            </div>

            {/* Description */}
            <TextareaField
              label="Description (Optional)"
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={500}
              rows={4}
              placeholder="Enter a short description about this role..."
              error={errors.description}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <Button
              text="Cancel"
              type="button"
              onClick={onClose}
              className="bg-white text-black hover:bg-gray-100"
            />
            <Button
              text={defaultValues ? "Update Role" : "Create Role"}
              type="submit"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
