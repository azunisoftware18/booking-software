// frontend/src/components/modals/UserModal.jsx
"use client";

import { useEffect, useState } from "react";
import { X, UserPlus, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import { useRoles } from "@/lib/queries/useRole";
import { usePlaces } from "@/lib/queries/usePlace";

const defaultForm = {
  fullName: "",
  email: "",
  password: "",
  roleId: "",
  placeId: "",
  status: "Active",
};

export default function UserModal({ open, onClose, onSubmit, defaultValues }) {
  const [formData, setFormData] = useState(defaultForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(defaultValues);

  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: places = [], isLoading: placesLoading } = usePlaces();

  useEffect(() => {
    if (!open) return;

    if (defaultValues) {
      setFormData({
        fullName: defaultValues.fullName || "",
        email: defaultValues.email || "",
        password: "",
        roleId: defaultValues.roleId || defaultValues.role?.id || "",
        placeId: defaultValues.placeId || defaultValues.place?.id || "",
        status: defaultValues.status || "Active",
      });
    } else {
      setFormData(defaultForm);
    }

    setErrors({});
    setShowPassword(false);
  }, [open, defaultValues]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Name is required";

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!isEdit && !formData.password.trim()) {
      newErrors.password = "Password is required";
    }
    if (!isEdit && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.roleId) newErrors.roleId = "Role is required";
    if (!formData.placeId) newErrors.placeId = "Place is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      roleId: formData.roleId,
      placeId: formData.placeId,
      status: formData.status,
    };

    if (formData.password.trim()) {
      payload.password = formData.password;
    }

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <UserPlus size={21} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEdit ? "Edit User" : "Add New User"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? "Update user details and access."
                  : "Create a new user account."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                  errors.fullName
                    ? "border-red-400"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
                  errors.email
                    ? "border-red-400"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={
                    isEdit
                      ? "Leave blank to keep current password"
                      : "Minimum 6 characters"
                  }
                  className={`w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition ${
                    errors.password
                      ? "border-red-400"
                      : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Role - Dynamic from DB */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="roleId"
                value={formData.roleId}
                onChange={handleChange}
                disabled={rolesLoading}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
                  errors.roleId
                    ? "border-red-400"
                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
              >
                <option value="">
                  {rolesLoading ? "Loading roles..." : "Select Role"}
                </option>
                {Array.isArray(roles) &&
                  roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.roleName || role.name || "Unnamed Role"}
                    </option>
                  ))}
              </select>
              {errors.roleId && (
                <p className="mt-1 text-xs text-red-500">{errors.roleId}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Place - Dynamic from DB */}
          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Place <span className="text-red-500">*</span>
            </label>
            <select
              name="placeId"
              value={formData.placeId}
              onChange={handleChange}
              disabled={placesLoading}
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition ${
                errors.placeId
                  ? "border-red-400"
                  : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
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
            {errors.placeId && (
              <p className="mt-1 text-xs text-red-500">{errors.placeId}</p>
            )}
          </div>

          {/* Login Info */}
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Login Information
            </p>
            <p className="mt-1 text-xs leading-5 text-blue-700">
              This user will be able to login using their <strong>Email</strong>{" "}
              with the password created above.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              text={isEdit ? "Update User" : "Create User"}
              className="rounded-xl px-6 py-3"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
