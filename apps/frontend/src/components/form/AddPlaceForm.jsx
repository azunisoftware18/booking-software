"use client";

import { useForm } from "react-hook-form";
import {
  MapPin,
  Globe,
  Plus,
  ImageIcon,
  Upload,
  X,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../ui/Button";
import InputField from "../ui/InputField";
import TextareaField from "../ui/TextareaField";
import dynamic from "next/dynamic";
import { ANNEXURE_OPTIONS } from "@/lib/placeAnnexures";

const MapPicker = dynamic(() => import("@/components/common/MapPicker"), {
  ssr: false,
});

export default function AddPlaceForm({
  submitText = "Save Venue",
  defaultValues = {},
  onSubmit,
  onCancel,
  existingPlaces = [],
}) {
  const [preview, setPreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const [annexureError, setAnnexureError] = useState("");

  const [selectedAnnexure, setSelectedAnnexure] = useState(
    defaultValues?.annexure || "",
  );

  const [pendingAnnexure, setPendingAnnexure] = useState("");

  const [selectedAnnexureOption, setSelectedAnnexureOption] = useState(
    defaultValues?.annexureOption || "",
  );

  const [pendingOption, setPendingOption] = useState("");

  const [showAnnexurePopup, setShowAnnexurePopup] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      annexure: defaultValues?.annexure || "",
      annexureOption: defaultValues?.annexureOption || "",
      name: "",
      location: "",
      shortDescription: "",
      description: "",
      latitude: "",
      longitude: "",
      image: "",
      ...defaultValues,
    },
  });

  const selectedImage = watch("image");

  // =========================================================
  // IMAGE PREVIEW
  // =========================================================
  useEffect(() => {
    if (!selectedImage) {
      setPreview(null);
      return;
    }

    if (typeof selectedImage === "string") {
      setPreview(selectedImage);
      return;
    }

    if (typeof File !== "undefined" && selectedImage instanceof File) {
      const url = URL.createObjectURL(selectedImage);

      setPreview(url);

      return () => URL.revokeObjectURL(url);
    }
  }, [selectedImage]);

  // =========================================================
  // EDIT DEFAULT VALUES
  // =========================================================
  useEffect(() => {
    const annexure = defaultValues?.annexure || "";
    const option = defaultValues?.annexureOption || "";

    reset({
      annexure,
      annexureOption: option,
      name: defaultValues?.name || "",
      location: defaultValues?.location || "",
      latitude: defaultValues?.latitude ?? "",
      longitude: defaultValues?.longitude ?? "",
      shortDescription: defaultValues?.shortDescription || "",
      description: defaultValues?.description || "",
      image: defaultValues?.image || "",
    });

    setSelectedAnnexure(annexure);
    setSelectedAnnexureOption(option);
    setPendingAnnexure("");
    setPendingOption("");
    setShowAnnexurePopup(false);
    setImageError("");
    setAnnexureError("");
  }, [defaultValues, reset]);

  // =========================================================
  // ANNEXURE DROPDOWN
  // =========================================================
  const handleAnnexureChange = (event) => {
    const value = event.target.value;

    if (!value) {
      setSelectedAnnexure("");
      setSelectedAnnexureOption("");
      setPendingAnnexure("");
      setPendingOption("");

      setValue("annexure", "", { shouldDirty: true });
      setValue("annexureOption", "", { shouldDirty: true });

      return;
    }

    setPendingAnnexure(value);

    // Preserve the existing selection if reopening the same annexure.
    const existingOption =
      selectedAnnexure === value &&
      ANNEXURE_OPTIONS[value]?.some(
        (option) => option.value === selectedAnnexureOption,
      )
        ? selectedAnnexureOption
        : "";

    setPendingOption(existingOption);
    setShowAnnexurePopup(true);
  };

  const handleAnnexureConfirm = () => {
    const validOption = ANNEXURE_OPTIONS[pendingAnnexure]?.some(
      (option) => option.value === pendingOption,
    );

    if (!pendingAnnexure || !validOption) return;

    const optionAlreadyUsed = existingPlaces.some(
      (place) =>
        place.id !== defaultValues?.id &&
        place.annexure === pendingAnnexure &&
        place.annexureOption === pendingOption,
    );

    if (optionAlreadyUsed) {
      setAnnexureError("This field already exists. Please select another option.");
      return;
    }

    setSelectedAnnexure(pendingAnnexure);
    setSelectedAnnexureOption(pendingOption);
    setAnnexureError("");

    setValue("annexure", pendingAnnexure, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setValue("annexureOption", pendingOption, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setPendingAnnexure("");
    setPendingOption("");
    setShowAnnexurePopup(false);
  };

  const handleAnnexureCancel = () => {
    setPendingAnnexure("");
    setPendingOption("");
    setShowAnnexurePopup(false);
  };

  // =========================================================
  // IMAGE VALIDATION
  // =========================================================
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setImageError("");

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setImageError("Please select a PNG, JPG, JPEG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    setValue("image", file, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // =========================================================
  // REMOVE IMAGE
  // =========================================================
  const removeImage = () => {
    setValue("image", "", {
      shouldDirty: true,
      shouldValidate: true,
    });

    setPreview(null);
    setImageError("");

    const input = document.getElementById("place-image");

    if (input) input.value = "";
  };

  // =========================================================
  // FORM SUBMIT
  // =========================================================
  const handleFormSubmit = async (data) => {
    try {
      if (
        !selectedAnnexure ||
        !ANNEXURE_OPTIONS[selectedAnnexure]?.some(
          (option) => option.value === selectedAnnexureOption,
        )
      ) {
        setPendingAnnexure(selectedAnnexure || "A");
        setPendingOption("");
        setShowAnnexurePopup(true);
        return;
      }

      const payload = {
        ...data,
        annexure: selectedAnnexure,
        annexureOption: selectedAnnexureOption,
        name: data.name.trim(),
        location: data.location.trim(),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        image: data.image || null,
      };

      await onSubmit?.(payload);

      reset({
        annexure: "",
        annexureOption: "",
        name: "",
        location: "",
        shortDescription: "",
        description: "",
        latitude: "",
        longitude: "",
        image: "",
      });

      setSelectedAnnexure("");
      setSelectedAnnexureOption("");
      setPendingAnnexure("");
      setPendingOption("");
      setShowAnnexurePopup(false);
      setPreview(null);
      setImageError("");
      setAnnexureError("");

      const input = document.getElementById("place-image");
      if (input) input.value = "";
    } catch (error) {
      console.error("Place form submit error:", error);
    }
  };

  // =========================================================
  // CANCEL
  // =========================================================
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    reset();
    setSelectedAnnexure("");
    setSelectedAnnexureOption("");
    setPendingAnnexure("");
    setPendingOption("");
    setShowAnnexurePopup(false);
    setPreview(null);
    setImageError("");
    setAnnexureError("");
  };

  // Currently selected option object
  const selectedOptionObj = ANNEXURE_OPTIONS[selectedAnnexure]?.find(
    (option) => option.value === selectedAnnexureOption,
  );

  const selectedOptionLabel = selectedOptionObj?.label;

  return (
    <div className="w-full bg-white p-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* =====================================================
            ANNEXURE DROPDOWN
        ===================================================== */}
        <div className="space-y-2">
          <label
            htmlFor="annexure-select"
            className="text-sm font-semibold text-slate-700"
          >
            Select Annexure
            <span className="ml-1 text-red-500">*</span>
          </label>

          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              id="annexure-select"
              value={selectedAnnexure}
              onChange={handleAnnexureChange}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Choose an annexure</option>
              <option value="A">Annexure A</option>
              <option value="B">Annexure B</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* SELECTED ANNEXURE OPTION CARD */}
          {selectedAnnexure && selectedAnnexureOption && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-600">
                Selected Annexure
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                Annexure {selectedAnnexure}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {selectedOptionLabel}
              </p>

              {/* SELECTED RATES */}
              {selectedOptionObj &&
                (selectedOptionObj.rate4Hours ||
                  selectedOptionObj.rate8Hours) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedOptionObj.rate4Hours && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        4 घंटे: ₹
                        {selectedOptionObj.rate4Hours.toLocaleString("en-IN")}
                      </span>
                    )}

                    {selectedOptionObj.rate8Hours && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        8 घंटे: ₹
                        {selectedOptionObj.rate8Hours.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                )}

              <button
                type="button"
                onClick={() => {
                  setPendingAnnexure(selectedAnnexure);
                  setPendingOption(selectedAnnexureOption);
                  setShowAnnexurePopup(true);
                }}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
                Change selection
              </button>
            </div>
          )}
        </div>

        {/* =====================================================
            ANNEXURE RADIO POPUP
        ===================================================== */}
        {showAnnexurePopup && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
            onClick={handleAnnexureCancel}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="annexure-dialog-title"
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="annexure-dialog-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    Select Annexure {pendingAnnexure}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose one option to continue.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAnnexureCancel}
                  className="rounded-lg p-2 hover:bg-slate-100"
                  aria-label="Close popup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {(ANNEXURE_OPTIONS[pendingAnnexure] || []).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      pendingOption === option.value
                        ? "border-black bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="annexureOption"
                      value={option.value}
                      checked={pendingOption === option.value}
                      onChange={() => {
                        setPendingOption(option.value);
                        setAnnexureError("");
                      }}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />

                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {option.label}
                      </p>

                      {(option.rate4Hours || option.rate8Hours) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {option.rate4Hours && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              4 Hours: ₹
                              {option.rate4Hours.toLocaleString("en-IN")}
                            </span>
                          )}

                          {option.rate8Hours && (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                              8 Hours: ₹
                              {option.rate8Hours.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {annexureError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {annexureError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleAnnexureCancel}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!pendingOption}
                  onClick={handleAnnexureConfirm}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            VENUE NAME + LOCATION
        ===================================================== */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InputField
            label="Venue / Place Name"
            icon={MapPin}
            error={errors.name?.message}
            {...register("name", {
              required: "Venue name is required",
              validate: (value) =>
                value.trim().length > 0 || "Venue name is required",
            })}
          />

          <InputField
            label="Location"
            icon={Globe}
            error={errors.location?.message}
            {...register("location", {
              required: "Location is required",
              validate: (value) =>
                value.trim().length > 0 || "Location is required",
            })}
          />
        </div>

        {/* =====================================================
            LATITUDE + LONGITUDE
        ===================================================== */}
        {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Latitude"
            placeholder="e.g. 27.1751"
            error={errors.latitude?.message}
            {...register("latitude", {
              required: "Latitude is required",
              valueAsNumber: true,
              validate: (value) =>
                (Number.isFinite(value) && value >= -90 && value <= 90) ||
                "Enter a valid latitude",
            })}
          />

          <InputField
            label="Longitude"
            placeholder="e.g. 78.0421"
            error={errors.longitude?.message}
            {...register("longitude", {
              required: "Longitude is required",
              valueAsNumber: true,
              validate: (value) =>
                (Number.isFinite(value) && value >= -180 && value <= 180) ||
                "Enter a valid longitude",
            })}
          />
        </div> */}

        {/* =====================================================
            MAP PICKER
        ===================================================== */}
        {/* <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Select Location on Map
          </label>

          <MapPicker
            initialLatitude={watch("latitude")}
            initialLongitude={watch("longitude")}
            setLatitude={(lat) =>
              setValue("latitude", lat, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            setLongitude={(lng) =>
              setValue("longitude", lng, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
        </div> */}

        {/* =====================================================
            IMAGE UPLOAD
        ===================================================== */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700">
            Venue Image
          </label>

          <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 transition-colors hover:border-slate-400">
            {!preview ? (
              <label
                htmlFor="place-image"
                className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg transition-colors hover:bg-slate-50"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <ImageIcon className="h-6 w-6 text-slate-500" />
                </div>

                <p className="text-sm font-semibold text-slate-700">
                  Upload Venue Image
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  PNG, JPG, JPEG or WEBP
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Maximum size: 5 MB
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  <Upload className="h-4 w-4" />
                  Choose Image
                </div>
              </label>
            ) : (
              <div className="relative">
                <img
                  src={preview}
                  alt="Venue preview"
                  className="h-64 w-full rounded-lg border border-slate-200 object-cover"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md hover:bg-red-50"
                  title="Remove image"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>

                <label
                  htmlFor="place-image"
                  className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-md hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" />
                  Change Image
                </label>
              </div>
            )}

            <input
              id="place-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {imageError && <p className="text-sm text-red-600">{imageError}</p>}
        </div>

        {/* =====================================================
            SHORT DESCRIPTION
        ===================================================== */}
        <TextareaField
          label="Short Description"
          placeholder="Enter short description..."
          error={errors.shortDescription?.message}
          {...register("shortDescription")}
        />

        {/* =====================================================
            FULL DESCRIPTION
        ===================================================== */}
        <TextareaField
          label="Full Description"
          placeholder="Enter full description..."
          error={errors.description?.message}
          {...register("description")}
        />

        {/* =====================================================
            BUTTONS
        ===================================================== */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" text="Cancel" onClick={handleCancel} />

          <Button
            icon={Plus}
            iconPosition="left"
            type="submit"
            text={isSubmitting ? "Saving..." : submitText}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}
