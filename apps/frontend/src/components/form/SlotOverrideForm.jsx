"use client";

import { Controller, useForm } from "react-hook-form";
import InputField from "@/components/ui/InputField";
import Button from "@/components/ui/Button";
import { useSelector } from "react-redux";
import { useSlotTemplates } from "@/lib/queries/useSlot";
import WeekdayDatePicker, {
  isMondayDate,
} from "@/components/ui/WeekdayDatePicker";

export default function SlotOverrideForm({ onSubmit }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  const currentPlace = useSelector(
  (state) => state.place.currentPlace
);

const placeId = currentPlace?.id;

const { data: slots = [] } = useSlotTemplates(placeId);

  const isClosed = watch("isClosed");

  const submitHandler = async (data) => {
    await onSubmit?.(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">

      {/* Date */}
      <div>
        <label className="mb-2 block text-sm font-medium">Date</label>
        <Controller
          control={control}
          name="date"
          rules={{ required: "Date required" }}
          render={({ field }) => (
            <WeekdayDatePicker
              value={field.value || ""}
              onChange={(date) => {
                if (!isMondayDate(date)) field.onChange(date);
              }}
              inputClassName="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm"
            />
          )}
        />
        {errors.date?.message && (
          <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      {/* 🔥 Start Time (24-hour only) */}
      <div>
  <label className="block text-sm font-medium mb-2">
    Select Slot
  </label>

  <select
    className="w-full border rounded-lg px-3 py-2"
    {...register("startTime", {
      required: "Start time required",
    })}
  >
    <option value="">Select Slot</option>

    {slots.map((slot) => (
      <option
        key={slot.id}
        value={slot.startTime}
      >
        {slot.startTime}
      </option>
    ))}
  </select>

  {errors.startTime && (
    <p className="text-red-500 text-sm mt-1">
      {errors.startTime.message}
    </p>
  )}
</div>

      {/* Capacity */}
      {!isClosed && (
        <InputField
          label="Override Capacity"
          type="number"
          error={errors.capacity?.message}
          {...register("capacity", {
            valueAsNumber: true,
          })}
        />
      )}

      {/* Close Toggle */}
      <div className="flex items-center gap-2">
        <input type="checkbox" {...register("isClosed")} />
        <label className="text-sm text-gray-700">
          Mark slot as Closed
        </label>
      </div>

      {/* Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          text={isSubmitting ? "Saving..." : "Save Override"}
        />
      </div>

    </form>
  );
}