"use client";

import { useForm } from "react-hook-form";
import { MapPin, Plus, X, Building2, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../ui/Button";
import InputField from "../ui/InputField";
import TextareaField from "../ui/TextareaField";
import dynamic from "next/dynamic";
import { ANNEXURE_OPTIONS } from "@/lib/placeAnnexures";

const MapPicker = dynamic(() => import("@/components/common/MapPicker"), {
  ssr: false,
});

const getAnnexureOptionLabel = (annexure, optionValue) =>
  ANNEXURE_OPTIONS[annexure]?.find((option) => option.value === optionValue)
    ?.label || "";

export default function AddPlaceForm({
  submitText = "Save Venue",
  defaultValues = {},
  onSubmit,
  onCancel,
  existingPlaces = [],
  canCreateSlots = false,
  canUpdateSlots = false,
  canDeleteSlots = false,
  assignedLocation = "",
}) {
  const [annexureError, setAnnexureError] = useState("");
  const [slotTemplates, setSlotTemplates] = useState([
    { date: "", startTime: "", endTime: "", capacity: "" },
  ]);
  const [slotError, setSlotError] = useState("");
  const [formError, setFormError] = useState("");

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
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      annexure: defaultValues?.annexure || "",
      annexureOption: defaultValues?.annexureOption || "",
      name: "",
      location: defaultValues?.location || assignedLocation,
      shortDescription: "",
      description: "",
      latitude: "",
      longitude: "",
      ...defaultValues,
    },
  });

  // =========================================================
  // EDIT DEFAULT VALUES
  // =========================================================
  useEffect(() => {
    const annexure = defaultValues?.annexure || "";
    const option = defaultValues?.annexureOption || "";

    reset({
      annexure,
      annexureOption: option,
      name:
        getAnnexureOptionLabel(annexure, option) || defaultValues?.name || "",
      location: defaultValues?.location || assignedLocation,
      latitude: defaultValues?.latitude ?? "",
      longitude: defaultValues?.longitude ?? "",
      shortDescription: defaultValues?.shortDescription || "",
      description: defaultValues?.description || "",
    });

    setSelectedAnnexure(annexure);
    setSelectedAnnexureOption(option);
    setPendingAnnexure("");
    setPendingOption("");
    setShowAnnexurePopup(false);
    setAnnexureError("");
    setSlotTemplates(
      defaultValues?.id
        ? (defaultValues.slotTemplates || []).map((slot) => ({
            id: slot.id,
            date: slot.date ? String(slot.date).slice(0, 10) : "",
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: String(slot.capacity),
          }))
        : [{ date: "", startTime: "", endTime: "", capacity: "" }],
    );
    setSlotError("");
  }, [assignedLocation, defaultValues, reset]);

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
      setValue("name", "", { shouldDirty: true, shouldValidate: true });

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
      setAnnexureError(
        "This field already exists. Please select another option.",
      );
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

    setValue("name", getAnnexureOptionLabel(pendingAnnexure, pendingOption), {
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
  // FORM SUBMIT
  // =========================================================
  const handleFormSubmit = async (data) => {
    try {
      setFormError("");

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

      const canEditSlotTemplates = Boolean(defaultValues?.id);
      const configuredSlots =
        canCreateSlots || canEditSlotTemplates
          ? slotTemplates.map((slot) => ({
              ...slot,
              capacity: Number(slot.capacity),
            }))
          : [];

      if (canCreateSlots || canEditSlotTemplates) {
        if (
          configuredSlots.some(
            (slot) =>
              !slot.startTime ||
              !slot.endTime ||
              !slot.date ||
              !Number.isInteger(slot.capacity) ||
              slot.capacity < 1,
          )
        ) {
          setSlotError(
            "Enter a date, start time, end time and capacity for every slot.",
          );
          return;
        }

        if (configuredSlots.some((slot) => slot.startTime >= slot.endTime)) {
          setSlotError(
            "Each slot's end time must be later than its start time.",
          );
          return;
        }

        const slotRanges = configuredSlots.map(
          (slot) => `${slot.date}-${slot.startTime}-${slot.endTime}`,
        );
        if (new Set(slotRanges).size !== configuredSlots.length) {
          setSlotError("Each slot must have a different time range.");
          return;
        }

        const capacitiesByStartTime = new Map();
        for (const slot of configuredSlots) {
          const sharedCapacity = capacitiesByStartTime.get(
            `${slot.date}-${slot.startTime}`,
          );
          if (
            sharedCapacity !== undefined &&
            sharedCapacity !== slot.capacity
          ) {
            setSlotError(
              "Slots with the same start time must have the same capacity.",
            );
            return;
          }
          capacitiesByStartTime.set(
            `${slot.date}-${slot.startTime}`,
            slot.capacity,
          );
        }
      }

      setSlotError("");

      const payload = {
        ...data,
        annexure: selectedAnnexure,
        annexureOption: selectedAnnexureOption,
        securityAmount: selectedOptionObj?.securityAmount,
        rate4Hours: selectedOptionObj?.rate4Hours ?? null,
        rate8Hours: selectedOptionObj?.rate8Hours ?? null,
        ratePerPerson: selectedOptionObj?.ratePerPerson ?? null,
        ratePerStudent: selectedOptionObj?.ratePerStudent ?? null,
        slotTemplates: configuredSlots,
        name: data.name.trim(),
        location: (data.location || assignedLocation).trim(),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      };

      await onSubmit?.(payload);

      reset({
        annexure: "",
        annexureOption: "",
        name: "",
        location: assignedLocation,
        shortDescription: "",
        description: "",
        latitude: "",
        longitude: "",
      });

      setSelectedAnnexure("");
      setSelectedAnnexureOption("");
      setPendingAnnexure("");
      setPendingOption("");
      setShowAnnexurePopup(false);
      setAnnexureError("");
      setSlotTemplates([{ date: "", startTime: "", endTime: "", capacity: "" }]);
      setSlotError("");
    } catch (error) {
      console.error("Place form submit error:", error);
    }
  };

  const handleInvalidSubmit = (formErrors) => {
    const firstError = Object.values(formErrors)[0];
    setFormError(
      firstError?.message || "Please review the required venue details.",
    );
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
    setSlotTemplates([{ date: "", startTime: "", endTime: "", capacity: "" }]);
    setSlotError("");
  };

  // Currently selected option object
  const selectedOptionObj = ANNEXURE_OPTIONS[selectedAnnexure]?.find(
    (option) => option.value === selectedAnnexureOption,
  );

  const selectedOptionLabel = selectedOptionObj?.label;

  return (
    <div className="w-full bg-white p-6">
      <form
        onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)}
        className="space-y-5"
      >
        {formError && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {formError}
          </p>
        )}
        {/* =====================================================
            ANNEXURE DROPDOWN
        ===================================================== */}
        <div className="space-y-2">
          <label
            htmlFor="annexure-select"
            className="text-sm font-semibold text-slate-700"
          >
            Select Venue
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
              <option value="">Choose an Venue</option>
              <option value="A">Event Venue</option>
              <option value="B">Security money deposit</option>
              <option value="C">Planetarium </option>
              {/* <option value="D">Annexure D</option> */}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* SELECTED ANNEXURE OPTION CARD */}
          {selectedAnnexure && selectedAnnexureOption && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-600">
                Selected Venue
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                Venue {selectedAnnexure}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {selectedOptionLabel}
              </p>

              {/* SELECTED RATES */}
              {selectedOptionObj && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedOptionObj.securityAmount != null && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      4/8 Hours: ₹
                      {Number(selectedOptionObj.securityAmount).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  )}

                  {selectedOptionObj.rate4Hours != null && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      4 Hours: ₹
                      {Number(selectedOptionObj.rate4Hours).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  )}

                  {selectedOptionObj.rate8Hours != null && (
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      8 Hours: ₹
                      {Number(selectedOptionObj.rate8Hours).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  )}

                  {selectedOptionObj.ratePerPerson != null && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      Per Person: ₹
                      {Number(selectedOptionObj.ratePerPerson).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  )}

                  {selectedOptionObj.ratePerStudent != null && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      Per Student: ₹
                      {Number(selectedOptionObj.ratePerStudent).toLocaleString(
                        "en-IN",
                      )}
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
                    Select Venue
                    {pendingAnnexure}
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

                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="break-words text-sm font-medium text-slate-700">
                        {option.label || option.name || option.value}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {option.securityAmount != null && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            4/8 Hours: ₹
                            {Number(option.securityAmount).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        )}

                        {option.rate4Hours != null && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            4 Hours: ₹
                            {Number(option.rate4Hours).toLocaleString("en-IN")}
                          </span>
                        )}

                        {option.rate8Hours != null && (
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            8 Hours: ₹
                            {Number(option.rate8Hours).toLocaleString("en-IN")}
                          </span>
                        )}

                        {option.ratePerPerson != null && (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                            Per Person: ₹
                            {Number(option.ratePerPerson).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        )}

                        {option.ratePerStudent != null && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            Per Student: ₹
                            {Number(option.ratePerStudent).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        )}
                      </div>
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

        {(!defaultValues?.id ||
          canCreateSlots ||
          canUpdateSlots ||
          canDeleteSlots) && (
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Booking Slots
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Slots added here will be linked to Annexure{" "}
                {selectedAnnexure || "option"}{" "}
                {selectedAnnexureOption ? `(${selectedAnnexureOption})` : ""}{" "}
                and shown for this place during booking.
                Slots with the same start time share capacity.
              </p>
            </div>

            {!defaultValues?.id && !canCreateSlots ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                You need slot creation permission to add booking slots.
              </p>
            ) : (
              <>
                {slotTemplates.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No booking slots are configured for this destination.
                  </p>
                )}
                {slotTemplates.map((slot, index) => (
                  <div
                    key={slot.id || index}
                    className="grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                  >
                    <label className="space-y-1 text-xs font-medium text-slate-600">
                      Date
                      <input
                        type="date"
                        value={slot.date}
                        onChange={(event) => {
                          const date = event.target.value;
                          setSlotTemplates((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, date } : item,
                            ),
                          );
                          setSlotError("");
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-600">
                      Start Time
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) => {
                          const startTime = event.target.value;
                          setSlotTemplates((current) => {
                            const matchingSlot = startTime
                              ? current.find(
                                  (candidate, candidateIndex) =>
                                    candidateIndex !== index &&
                                    candidate.startTime === startTime,
                                )
                              : null;

                            return current.map((item, itemIndex) => {
                              if (itemIndex === index) {
                                return {
                                  ...item,
                                  startTime,
                                  ...(matchingSlot
                                    ? { capacity: matchingSlot.capacity }
                                    : {}),
                                };
                              }

                              return item;
                            });
                          });
                          setSlotError("");
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-600">
                      End Time
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) => {
                          setSlotTemplates((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, endTime: event.target.value }
                                : item,
                            ),
                          );
                          setSlotError("");
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-medium text-slate-600">
                      Capacity
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={slot.capacity}
                        onChange={(event) => {
                          const capacity = event.target.value;
                          setSlotTemplates((current) =>
                            current.map((item, itemIndex) =>
                              item.startTime === slot.startTime
                                ? { ...item, capacity }
                                : item,
                            ),
                          );
                          setSlotError("");
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={Boolean(slot.id) && !canDeleteSlots}
                      onClick={() => {
                        setSlotTemplates((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        );
                        setSlotError("");
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Remove slot ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {slotError && (
                  <p className="text-sm text-red-600" role="alert">
                    {slotError}
                  </p>
                )}

                {canCreateSlots && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlotTemplates((current) => [
                        ...current,
                        { date: "", startTime: "", endTime: "", capacity: "" },
                      ]);
                      setSlotError("");
                    }}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    + Add another slot
                  </button>
                )}
              </>
            )}
            {defaultValues?.id && !canUpdateSlots && canDeleteSlots && (
              <p className="text-xs text-slate-500">
                Slot timing and capacity can’t be changed with your current
                permissions.
              </p>
            )}
          </section>
        )}

        {/* =====================================================
            VENUE NAME
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
          {assignedLocation || defaultValues?.location ? (
            <input
              type="hidden"
              {...register("location", {
                required: "Location is required",
                validate: (value) =>
                  value.trim().length > 0 || "Location is required",
              })}
            />
          ) : (
            <InputField
              label="Location"
              error={errors.location?.message}
              {...register("location", {
                required: "Location is required",
                validate: (value) =>
                  value.trim().length > 0 || "Location is required",
              })}
            />
          )}
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
            SHORT DESCRIPTION
        ===================================================== */}
        {/* <TextareaField
          label="Description"
          placeholder="Enter short description..."
          error={errors.shortDescription?.message}
          {...register("shortDescription")}
        /> */}

        {/* =====================================================
            FULL DESCRIPTION
        ===================================================== */}
        <TextareaField
          label="Full Description (Optional)"
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
