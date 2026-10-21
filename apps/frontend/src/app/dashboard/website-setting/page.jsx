"use client";

import React, { useState } from "react";
import { ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useGetSetting } from "@/lib/queries/useSetting";
import { useUpdateSetting } from "@/lib/mutations/useSetting";
import { getUploadedAssetUrl } from "@/lib/assetUrl";
import Button from "@/components/ui/Button";
import TextareaField from "@/components/ui/TextareaField";
import InputField from "@/components/ui/InputField";

function Page() {
  const { data, isLoading } = useGetSetting();
  const { mutate, isPending } = useUpdateSetting();
  const user = useSelector((state) => state.auth.user);
  const setting = data?.data ?? data;
  const defaultCompanyName =
    user?.location?.name || user?.location?.city || "";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-pulse font-medium text-slate-500">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <SettingsForm
      key={`${setting?.updatedAt || setting?.id || "new-setting"}-${defaultCompanyName}`}
      setting={setting}
      defaultCompanyName={defaultCompanyName}
      mutate={mutate}
      isPending={isPending}
    />
  );
}

function SettingsForm({ setting, defaultCompanyName, mutate, isPending }) {
  const [form, setForm] = useState(() => ({
    companyName: setting?.companyName || defaultCompanyName,
    email: setting?.email || "",
    phone: setting?.phone || "",
    address: setting?.address || "",
  }));
  const [logo, setLogo] = useState(null);
  const [favicon, setFavicon] = useState(null);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));

    if (logo) formData.append("logo", logo);
    if (favicon) formData.append("favicon", favicon);

    mutate(formData, {
      onSuccess: () => {
        setLogo(null);
        setFavicon(null);
        toast.success("Website settings updated successfully.");
      },
      onError: (error) => {
        toast.error(
          error?.response?.data?.message || "Unable to update website settings.",
        );
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 bg-white px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Website Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the public company details and branding shown across the website.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 px-8 py-6">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              General Information
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <InputField
                label="Company Name"
                type="text"
                name="companyName"
                placeholder="Company name"
                value={form.companyName}
                onChange={handleChange}
              />
              <InputField
                label="Email Address"
                type="email"
                name="email"
                placeholder="contact@company.com"
                value={form.email}
                onChange={handleChange}
              />
              <InputField
                label="Phone Number"
                type="text"
                name="phone"
                placeholder="+91 00000 00000"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </section>

          <hr className="border-slate-200" />

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Branding</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <BrandUpload
                label={setting?.logo ? "Update Logo" : "Upload Logo"}
                description="PNG, JPG, or WebP. Maximum file size 2MB."
                preview={getUploadedAssetUrl(setting?.logo)}
                alt="Company logo"
                onChange={(event) => setLogo(event.target.files?.[0] || null)}
                selectedFile={logo}
                accept="image/png,image/jpeg,image/webp"
                roundedPreview
              />
              <BrandUpload
                label={setting?.favicon ? "Update Favicon" : "Upload Favicon"}
                description="PNG, WebP, JPG, or ICO. A square 32×32 or 48×48 image works best."
                preview={getUploadedAssetUrl(setting?.favicon)}
                alt="Website favicon"
                onChange={(event) => setFavicon(event.target.files?.[0] || null)}
                selectedFile={favicon}
                accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
              />
            </div>
          </section>

          <hr className="border-slate-200" />

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Location</h2>
            <TextareaField
              label="Physical Address"
              placeholder="123 Business Avenue&#10;Suite 100&#10;City, State, Zip"
              rows={3}
              name="address"
              value={form.address}
              onChange={handleChange}
              resize="vertical"
            />
          </section>

          <div className="mt-8 flex items-center justify-end border-t border-slate-200 pt-6">
            <Button
              type="submit"
              text={isPending ? "Saving Changes..." : "Save Settings"}
              className={isPending ? "pointer-events-none opacity-50" : "min-w-[150px]"}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

function BrandUpload({
  label,
  description,
  preview,
  alt,
  onChange,
  selectedFile,
  accept,
  roundedPreview = false,
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 shadow-sm ${
            roundedPreview ? "rounded-xl" : "rounded-lg"
          }`}
        >
          {preview ? (
            <img src={preview} alt={alt} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7 text-slate-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <InputField
            label={label}
            type="file"
            accept={accept}
            onChange={onChange}
          />
          <p className="mt-2 text-xs text-slate-500">{description}</p>
          {selectedFile && (
            <p className="mt-1 truncate text-xs font-medium text-blue-600">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Page;
