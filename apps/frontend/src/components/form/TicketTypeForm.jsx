"use client";

import { useForm, useWatch } from "react-hook-form";

import { MapPin, IndianRupee } from "lucide-react";
import Button from "../ui/Button";

const centerRates = {
  "Jhalana Patan": [
    { name: "Per Person", price: 5 },
    { name: "Per Student*", price: 3 },
    { name: "Group of Student**", price: 2 },
    { name: "Planetarium", price: 10 },
    { name: "Planetarium (in Group)", price: 5 },
  ],
  Udaipur: [
    { name: "General Public", price: 10 },
    { name: "Student", price: 5 },
    { name: "Group of Student**", price: 3 },
    { name: "Planetarium", price: 10 },
    { name: "Planetarium (in Group)", price: 5 },
  ],
  Nawalgarh: [
    { name: "General Public", price: 20 },
    { name: "Student", price: 15 },
    { name: "Group of Student**", price: 10 },
    { name: "Planetarium", price: 10 },
    { name: "Planetarium (in Group)", price: 5 },
  ],
  Jodhpur: [
    { name: "General Public", price: 20 },
    { name: "Student", price: 15 },
    { name: "Group of Student**", price: 0, free: true },
    { name: "Planetarium", price: 10 },
    { name: "Planetarium (in Group)", price: 5 },
  ],
  Ajmer: [
    { name: "General Public", price: 20 },
    { name: "Student", price: 15 },
    { name: "Group of Student**", price: 0, free: true },
    { name: "Planetarium", price: 10 },
    { name: "Planetarium (in Group)", price: 5 },
  ],
};

export default function TicketTypeForm({
  onSubmit,
  defaultValues = {},
  currentUser,
}) {
  const assignedLocation = currentUser?.location;
  const assignedCenter = assignedLocation?.city || assignedLocation?.name;
  const assignedLocationLabel =
    assignedLocation?.name || assignedLocation?.city;
  const assignedRates = assignedCenter ? centerRates[assignedCenter] || [] : [];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      center: assignedCenter || "Jhalana Patan",
      name: "",
      taxPercent: 0,
      price: "",
      isAvailable: true,
      ...defaultValues,
      ...(assignedCenter ? { center: assignedCenter } : {}),
    },
  });

  const selectedCenter = useWatch({ control, name: "center" });
  const selectedName = useWatch({ control, name: "name" });
  const selectedPrice = Number(useWatch({ control, name: "price" }) || 0);
  const selectedTaxPercent = Number(
    useWatch({ control, name: "taxPercent" }) || 0,
  );
  const ratesForSelectedCenter = assignedCenter
    ? assignedRates
    : centerRates[selectedCenter] || [];
  const selectedRate = ratesForSelectedCenter.find(
    (rate) => rate.name === selectedName,
  );
  const rates = [...ratesForSelectedCenter];

  if (selectedName && !selectedRate) {
    rates.push({
      name: selectedName,
      price: Number(defaultValues.price || 0),
      unavailable: defaultValues.isAvailable === false,
      free:
        Number(defaultValues.price) === 0 &&
        defaultValues.isAvailable !== false,
    });
  }

  const submitHandler = async (data) => {
    const formattedData = {
      ...data,
      price: Number(data.price),
      taxPercent: Number(data.taxPercent || 0),
      isAvailable: data.isAvailable !== false && data.isAvailable !== "false",
    };

    await onSubmit?.(formattedData);

    if (!defaultValues?.id) {
      reset();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl p-6 shadow-sm ">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {defaultValues?.id ? "Update Entry Fee" : "Create Entry Fee"}
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Configure ticket pricing and booking limits
        </p>
      </div>

      <form onSubmit={handleSubmit(submitHandler)} className="space-y-5">
        <div className="w-full">
          <label
            htmlFor="ticket-center"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Location
          </label>
          <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-black">
            <MapPin size={18} className="mr-2 shrink-0 text-gray-400" />
            {assignedLocation ? (
              <>
                <span className="w-full text-sm text-gray-700">
                  {assignedLocationLabel}
                </span>
                <input
                  id="ticket-center"
                  type="hidden"
                  {...register("center", { required: "Location is required" })}
                />
              </>
            ) : (
              <select
                id="ticket-center"
                className="w-full bg-transparent text-sm outline-none"
                {...register("center", {
                  required: "Location is required",
                  onChange: () => {
                    setValue("name", "");
                    setValue("price", "");
                    setValue("isAvailable", true);
                  },
                })}
              >
                {Object.keys(centerRates).map((center) => (
                  <option key={center} value={center}>
                    {center}
                  </option>
                ))}
                {selectedCenter && !centerRates[selectedCenter] && (
                  <option value={selectedCenter}>{selectedCenter}</option>
                )}
              </select>
            )}
          </div>
          {errors.center?.message && (
            <p className="mt-1 text-xs text-red-500">{errors.center.message}</p>
          )}
        </div>

        <div className="w-full">
          <label
            htmlFor="ticket-category"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Ticket Category
          </label>
          <div
            className={`flex items-center rounded-lg border px-3 py-2 focus-within:border-black ${errors.name ? "border-red-500" : "border-gray-300"}`}
          >
            <select
              id="ticket-category"
              className="w-full bg-transparent text-sm outline-none"
              {...register("name", { required: "Ticket category is required" })}
              onChange={(event) => {
                const rate = ratesForSelectedCenter.find(
                  (item) => item.name === event.target.value,
                );
                const isLegacyRate =
                  !rate && event.target.value === defaultValues.name;
                setValue("name", event.target.value, { shouldValidate: true });
                setValue(
                  "isAvailable",
                  rate
                    ? !rate.unavailable
                    : isLegacyRate
                      ? defaultValues.isAvailable !== false
                      : true,
                );
                setValue(
                  "taxPercent",
                  rate?.taxPercent ??
                    (isLegacyRate ? Number(defaultValues.taxPercent || 0) : 0),
                );
              }}
            >
              <option value="">Select a category</option>
              {rates.map((rate) => (
                <option key={rate.name} value={rate.name}>
                  {rate.name}
                </option>
              ))}
            </select>
          </div>
          {errors.name?.message && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <input type="hidden" {...register("isAvailable")} />
        <div className="w-full">
          <label
            htmlFor="ticket-price"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Entry Fees (in Rs.)
          </label>
          <div
            className={`flex items-center rounded-lg border px-3 py-2 focus-within:border-black ${errors.price ? "border-red-500" : "border-gray-300"}`}
          >
            <IndianRupee size={18} className="mr-2 text-gray-400" />
            <input
              id="ticket-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Enter entry fee"
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              {...register("price", {
                required: "Entry fee is required",
                valueAsNumber: true,
                validate: (value) =>
                  (Number.isFinite(value) && value >= 0) ||
                  "Enter a valid entry fee",
              })}
            />
          </div>
          {errors.price?.message && (
            <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>
          )}
        </div>

        <div className="w-full">
          <label
            htmlFor="ticket-tax-percent"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            GST / Tax (%)
          </label>
          <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 focus-within:border-black">
            <input
              id="ticket-tax-percent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="w-full bg-transparent text-sm outline-none"
              {...register("taxPercent", {
                valueAsNumber: true,
                min: { value: 0, message: "Tax cannot be below 0%" },
                max: { value: 100, message: "Tax cannot exceed 100%" },
              })}
            />
            <span className="text-sm font-semibold text-gray-500">%</span>
          </div>
          {errors.taxPercent?.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.taxPercent.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Applied to the entry fee and included in the amount charged.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            text="Reset"
            onClick={() => reset()}
            className="px-6"
          />

          <Button
            type="submit"
            text={
              isSubmitting
                ? "Saving..."
                : defaultValues?.id
                  ? "Update Entry Fee"
                  : "Create Entry Fee"
            }
            className="px-8"
          />
        </div>
      </form>
    </div>
  );
}
