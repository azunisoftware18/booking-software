"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";

export const parseDateValue = (value) => {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatDateValue = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export const isMondayDate = (value) => parseDateValue(value)?.getDay() === 1;

export const getNextOpenDate = (date) => {
  const nextDate = new Date(date);
  if (nextDate.getDay() === 1) nextDate.setDate(nextDate.getDate() + 1);
  return formatDateValue(nextDate);
};

const containsMondayAfter = (startValue, endDate) => {
  const startDate = parseDateValue(startValue);
  if (!startDate) return false;
  if (startDate.getDay() === 1) return true;

  const cursor = new Date(startDate);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= endDate) {
    if (cursor.getDay() === 1) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
};

export default function WeekdayDatePicker({
  value = "",
  minDate = "",
  rangeStartDate = "",
  onChange,
  inputClassName = "block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => parseDateValue(value) || parseDateValue(minDate) || new Date(),
  );
  const pickerRef = useRef(null);
  const selectedDate = isMondayDate(value) ? undefined : parseDateValue(value);
  const earliestDate = parseDateValue(minDate);
  const todayValue = formatDateValue(new Date());
  const todayDate = parseDateValue(todayValue);

  const isDisabledDate = (date) =>
    date.getDay() === 1 ||
    Boolean(earliestDate && date < earliestDate) ||
    Boolean(rangeStartDate && containsMondayAfter(rangeStartDate, date));

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!pickerRef.current?.contains(event.target)) setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative mt-1">
      <div className="relative">
        <input
          type="text"
          readOnly
          value={selectedDate?.toLocaleDateString("en-US") || ""}
          onClick={() => setIsOpen((open) => !open)}
          className={inputClassName}
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => setIsOpen((open) => !open)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-700"
        >
          <CalendarDays size={14} />
        </button>
      </div>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border border-slate-300 bg-white p-2 shadow-lg">
          <DayPicker
            mode="single"
            selected={selectedDate}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelect={(date) => {
              if (!date || isDisabledDate(date)) return;
              onChange(formatDateValue(date));
              setIsOpen(false);
            }}
            disabled={isDisabledDate}
            weekStartsOn={0}
            showOutsideDays
            style={{
              "--rdp-accent-color": "#994113",
              "--rdp-disabled-opacity": "0.4",
              "--rdp-day_button-height": "2rem",
              "--rdp-day_button-width": "2rem",
              "--rdp-day-height": "2.25rem",
              "--rdp-day-width": "2.25rem",
            }}
          />
          <div className="flex justify-between border-t border-slate-200 pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="text-blue-700 hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={isDisabledDate(todayDate)}
              onClick={() => {
                onChange(todayValue);
                setIsOpen(false);
              }}
              className="text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
