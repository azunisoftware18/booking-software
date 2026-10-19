"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, CheckCheck } from "lucide-react";
import { useBookingById } from "@/hooks/useBooking";
import api from "@/lib/api";

function getTicketGstGroups(tickets = []) {
  const groups = new Map();

  for (const ticket of tickets) {
    const type = ticket.type;
    if (!type) continue;

    const taxPercent = Number(type.taxPercent || 0);
    const total = Math.round(Number(type.price) * 100) / 100;
    const base =
      taxPercent > 0
        ? Math.round((total / (1 + taxPercent / 100)) * 100) / 100
        : total;
    const tax = Math.round((total - base) * 100) / 100;
    const cgst = Math.round((tax / 2) * 100) / 100;
    const key = type.id || `${type.name}-${taxPercent}`;
    const group = groups.get(key) || {
      id: type.id,
      name: type.name,
      quantity: 0,
      base: 0,
      cgst: 0,
      sgst: 0,
      taxPercent,
    };

    group.quantity += 1;
    group.base += base;
    group.cgst += cgst;
    group.sgst += Math.round((tax - cgst) * 100) / 100;
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function getAnnexureGroups(items = []) {
  const groups = new Map();

  for (const item of items) {
    const time = new Date(item.slotDateTime).toISOString().slice(11, 16);
    const key = [
      item.placeId,
      time,
      item.durationHours ?? "",
      item.persons ?? 0,
      item.students ?? 0,
    ].join(":");
    const group = groups.get(key) || {
      ...item,
      key,
      amount: 0,
      slotDates: [],
    };

    group.amount += Number(item.amount || 0);
    group.slotDates.push(item.slotDateTime);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => {
    const sortedDates = group.slotDates.sort(
      (first, second) => new Date(first) - new Date(second),
    );
    return {
      ...group,
      firstSlotDateTime: sortedDates[0],
      lastSlotDateTime: sortedDates[sortedDates.length - 1],
    };
  });
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId")?.trim();
  const receiptToken = searchParams.get("receiptToken");

  const { data: booking, isLoading } = useBookingById(bookingId, receiptToken);

  const handleDownload = () => {
    const baseUrl = api.defaults.baseURL || "http://localhost:8000/api";
    const downloadUrl = receiptToken
      ? `${baseUrl}/ticket/receipt/${bookingId}/download?receiptToken=${encodeURIComponent(receiptToken)}`
      : `${baseUrl}/ticket/download/${bookingId}`;
    window.open(downloadUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-sandstone">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gold/20 border-t-royal-blue rounded-full animate-spin" />
          <p className="font-serif italic text-royal-blue/70 text-xs tracking-widest uppercase">
            Verifying Treasury Ledger...
          </p>
        </div>
      </div>
    );
  }
  {
    console.log(booking);
  }
  const annexureGroups = getAnnexureGroups(booking?.annexureItems);
  const annexureDates = (booking?.annexureItems || [])
    .map((item) => new Date(item.slotDateTime))
    .sort((first, second) => first - second);
  const formatVisitDate = (date) =>
    date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const formattedDate = booking?.slotDateTime
    ? booking.bookingType === "ANNEXURE" && annexureDates.length > 1
      ? `${formatVisitDate(annexureDates[0])} – ${formatVisitDate(
          annexureDates[annexureDates.length - 1],
        )}`
      : formatVisitDate(new Date(booking.slotDateTime))
    : "-";

  const formattedTime = booking?.slotDateTime
    ? new Date(
        `1970-01-01T${booking.slotDateTime.split("T")[1].slice(0, 5)}`,
      ).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "-";
  const ticketGstGroups = getTicketGstGroups(booking?.tickets).filter(
    (group) => group.taxPercent > 0,
  );
  const formatAmount = (amount) =>
    Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-3 bg-sandstone relative overflow-y-auto select-none">
      <div className="absolute inset-0 opacity-[0.05] bg-mandala pointer-events-none scale-105"></div>
      <div className="w-full max-w-2xl text-center z-10 flex flex-col justify-center items-center space-y-3 sm:space-y-4">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex justify-center shrink-0"
        >
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-[#1b4332] to-[#0d2117] flex items-center justify-center shadow-lg border border-gold/20 relative">
            <CheckCheck size={32} className="text-gold" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-0.5 sm:space-y-1 px-2 shrink-0"
        >
          <p className="text-[11px] sm:text-xs tracking-[10px] text-jaipur-dark uppercase font-extrabold font-sans">
            Booking confromed
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-royal-blue font-bold tracking-wide drop-shadow-sm">
            Reservation Complete
          </h1>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 150,
            damping: 18,
            delay: 0.25,
          }}
          className="relative w-full bg-white rounded-3xl border border-gold/25 shadow-[0_15px_40px_rgba(11,33,73,0.06)] overflow-hidden flex flex-col my-1"
        >
          <div className="absolute inset-2 sm:inset-2.5 border border-gold/10 rounded-2xl pointer-events-none"></div>
          <div className="absolute inset-2.5 sm:inset-3 border border-dashed border-gold/10 rounded-2xl pointer-events-none"></div>

          <div className="absolute left-0 top-[54%] -translate-x-1/2 w-6 h-6 rounded-full bg-sandstone border-r border-gold/15 z-20"></div>
          <div className="absolute right-0 top-[54%] translate-x-1/2 w-6 h-6 rounded-full bg-sandstone border-l border-gold/15 z-20"></div>

          <div className="p-4 sm:p-6 pb-3 sm:pb-4 text-center space-y-1 sm:space-y-2">
            <div className="space-y-0.5">
              <span className="text-[9px] tracking-[4px] text-jaipur-dark uppercase font-bold font-sans block">
                Official Bookinig Ticket
              </span>
              <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl text-royal-blue font-bold tracking-wide truncate px-4">
                {booking?.bookingType === "ANNEXURE"
                  ? "Annexure booking"
                  : booking?.place?.name || booking?.placeId?.name || ""}
              </h3>
              <p className="text-[11px] sm:text-xs font-sans text-gray-400 font-semibold tracking-wide">
                {booking?.place?.location || "Jaipur, Rajasthan"}
              </p>
            </div>

            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold/30 to-transparent mx-auto" />

            <div className="grid grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-4 pt-1 sm:pt-2 px-4 text-left">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-sans font-medium">
                  Date of Visit
                </span>
                <span className="text-xs sm:text-base font-serif font-bold text-royal-blue tracking-wide block truncate">
                  {formattedDate}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-sans font-medium">
                  Visiting Time
                </span>
                <span className="text-xs sm:text-base font-serif font-bold text-royal-blue tracking-wide block">
                  {formattedTime}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-sans font-medium">
                  {booking?.bookingType === "ANNEXURE"
                    ? "Reserved venue-days"
                    : "Reserved seats"}
                </span>

                {booking?.bookingType === "ANNEXURE" ? (
                  <span className="text-xs sm:text-base font-serif font-bold text-royal-blue tracking-wide block truncate">
                    {booking?.totalSeats || "-"}
                  </span>
                ) : (
                  <span className="text-xs sm:text-base font-serif font-bold text-royal-blue tracking-wide block truncate">
                    Visitor{" "}
                    <span className="text-jaipur-dark px-1 font-sans font-black">
                      :
                    </span>{" "}
                    <span className="text-jaipur-dark text-sm sm:text-lg">
                      {booking?.totalSeats || "-"}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-right">
                {/* <span className="text-[10px] uppercase tracking-wider text-gray-400 block font-sans font-medium">Payment Mode</span> */}
                {/* <span className="text-xs sm:text-base font-serif font-bold text-royal-blue tracking-wide block">Easebuzz</span> */}
              </div>
            </div>
            {booking?.bookingType === "ANNEXURE" &&
              booking.annexureItems?.length > 0 && (
                <div className="mt-4 border-t border-gold/10 px-4 pt-3 text-left">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Selected options
                  </p>
                  <div className="max-h-28 space-y-2 overflow-y-auto">
                    {annexureGroups.map((item) => (
                      <div
                        key={item.key}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <span className="min-w-0 text-royal-blue">
                          <span className="block truncate font-semibold">
                            {item.place?.annexure}-{item.place?.annexureOption}:{" "}
                            {item.place?.name}
                          </span>
                          <span className="block text-gray-500">
                            {new Date(item.firstSlotDateTime).toLocaleDateString("en-IN")}
                            {item.firstSlotDateTime !== item.lastSlotDateTime &&
                              ` - ${new Date(item.lastSlotDateTime).toLocaleDateString("en-IN")}`}
                            {`, ${new Date(`1970-01-01T${item.firstSlotDateTime.split("T")[1].slice(0, 5)}`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`}
                          </span>
                          <span className="block text-gray-500">
                            {item.durationHours != null
                              ? `${item.durationHours} hours × ${item.slotDates.length} ${item.slotDates.length === 1 ? "day" : "days"}`
                              : `${item.persons} persons, ${item.students} students`}
                          </span>
                        </span>
                        <span className="shrink-0 font-bold text-jaipur-dark">
                          ₹{Number(item.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            {booking?.bookingType !== "ANNEXURE" &&
              ticketGstGroups.some((group) => group.taxPercent > 0) && (
                <div className="mt-3 border-t border-gold/10 px-4 pt-3 text-left">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    GST breakup
                  </p>
                  <div className="space-y-2">
                    {ticketGstGroups.map((group) => (
                      <div
                        key={group.id || `${group.name}-${group.taxPercent}`}
                        className="text-xs text-royal-blue"
                      >
                        <div className="flex justify-between gap-3 font-semibold">
                          <span className="min-w-0 truncate">
                            {group.name} × {group.quantity}
                          </span>
                          <span className="shrink-0">
                            Base ₹{formatAmount(group.base)}
                          </span>
                        </div>
                        <div className="mt-1 flex justify-between gap-3 text-[11px] text-gray-500">
                          <span>
                            CGST {group.taxPercent / 2}% ₹
                            {formatAmount(group.cgst)}
                          </span>
                          <span>
                            SGST {group.taxPercent / 2}% ₹
                            {formatAmount(group.sgst)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <div className="relative w-full px-6 my-0.5 z-10">
            <div className="w-full border-t border-dashed border-gold/25"></div>
          </div>

          <div className="p-4 sm:p-6 py-3 sm:py-4 bg-sandstone/30 border-t border-gold/5 flex justify-between items-center px-6 sm:px-8 relative">
            <div className="text-left space-y-0.5">
              <span className="text-[10px] uppercase tracking-[2px] text-gray-400 block font-sans font-bold">
                Total Fare Paid
              </span>
              <span className="text-2xl sm:text-3xl font-serif font-black text-royal-blue tracking-wide block">
                ₹{booking?.totalAmount || "-"}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-mono tracking-widest text-royal-blue/30 font-bold select-none text-right">
              #ET-{bookingId ? bookingId.slice(-6).toUpperCase() : "7FCFA9"}
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="pt-1 max-w-xs w-full mx-auto space-y-2 shrink-0"
        >
          <button
            onClick={handleDownload}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-jaipur-dark to-[#994113] text-xs sm:text-sm text-white font-bold font-serif tracking-[3px] uppercase py-3 rounded-xl border border-gold/30 shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
          >
            Download E-Ticket{" "}
            <Download size={14} className="text-gold animate-pulse" />
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold font-serif tracking-[2px] text-royal-blue/60 hover:text-royal-blue uppercase transition-colors py-1 group cursor-pointer"
          >
            Back To Home Gateway{" "}
            <span className="group-hover:translate-x-1 transition-transform duration-300 text-sm">
              ⟶
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-sandstone font-serif italic text-royal-blue animate-pulse tracking-widest text-sm uppercase">
          Invoking Pass Summary...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
