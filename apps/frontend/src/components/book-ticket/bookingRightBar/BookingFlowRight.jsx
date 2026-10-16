"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePlace } from "@/hooks/useCurrentPlace";
import { useBookingMutation } from "@/hooks/useBookingMutation";
import { useBookingLocations } from "@/hooks/useBookingLocations";
import { setCurrentPlace } from "@/store/slices/placeSlice";
import { resetBooking, setTickets } from "@/store/slices/bookingSlice";
import DateSelector from "./bookingParts/DateSelector";
import TicketCounter from "./bookingParts/TicketCounter";
import VisitorForm from "./bookingParts/VisitorForm";
import { ArrowRight, Landmark, Lock, MapPin, Ticket } from "lucide-react";
import FullPageLoader from "@/components/ui/FullPageLoader";

let atomCheckoutScriptPromise;

function loadAtomCheckoutScript(scriptUrl) {
  if (window.AtomPaynetz) return Promise.resolve();
  if (atomCheckoutScriptPromise) return atomCheckoutScriptPromise;

  atomCheckoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    const handleLoad = () => {
      if (window.AtomPaynetz) {
        resolve();
      } else {
        reject(new Error("ATOM checkout did not load correctly"));
      }
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load ATOM checkout")),
      { once: true },
    );

    script.src = scriptUrl;
    script.async = true;
    script.dataset.atomCheckout = "true";
    document.head.appendChild(script);
  });

  atomCheckoutScriptPromise = atomCheckoutScriptPromise.catch((error) => {
    atomCheckoutScriptPromise = null;
    throw error;
  });

  return atomCheckoutScriptPromise;
}

export default function BookingFlowRight() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryFeeIds = searchParams.getAll("entryFeeId");
  const entryFeeId = entryFeeIds[0] || null;
  const requestedQuantities = searchParams.getAll("quantity");
  const initialEntryFeeQuantities = Object.fromEntries(
    entryFeeIds.map((id, index) => {
      const requestedQuantity = Number(requestedQuantities[index]);
      return [
        id,
        Number.isSafeInteger(requestedQuantity) && requestedQuantity > 0
          ? requestedQuantity
          : 1,
      ];
    }),
  );
  const [step, setStep] = useState(0);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationSelectionStep, setLocationSelectionStep] = useState(1);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [entryFeeVenueId, setEntryFeeVenueId] = useState(null);
  const [selectedEntryFeeGroup, setSelectedEntryFeeGroup] = useState(null);
  const [isDirectEntryFeeModalDismissed, setIsDirectEntryFeeModalDismissed] =
    useState(false);
  const [selectedEntryFeeQuantities, setSelectedEntryFeeQuantities] =
    useState(() => initialEntryFeeQuantities);
  const [bookingError, setBookingError] = useState("");

  const dispatch = useDispatch();
  const reduxData = useSelector((state) => state.booking);
  const currentUser = useSelector((state) => state.auth?.user);
  const isLoggedIn = Boolean(currentUser);

  const { placeId, isPlaceLoaded } = usePlace();
  const {
    data: bookingLocations = [],
    isLoading: isLoadingLocations,
    isError: hasLocationError,
    refetch: refetchLocations,
  } = useBookingLocations();

  const { mutateAsync: createBooking, isPending: isSubmitting } =
    useBookingMutation();

  const directEntryFeeLocation = entryFeeIds.length
    ? bookingLocations.find((location) =>
      entryFeeIds.every((id) =>
        location.entryFees?.some((entryFee) => entryFee.id === id),
      ),
    )
    : null;
  const directEntryFees =
    directEntryFeeLocation?.entryFees?.filter((entryFee) =>
      entryFeeIds.includes(entryFee.id),
    ) || [];
  const selectedLocation =
    bookingLocations.find((location) => location.id === selectedLocationId) ||
    directEntryFeeLocation;
  const isDirectEntryFeeUnavailable =
    entryFeeIds.length > 0 &&
    !isLoadingLocations &&
    !hasLocationError &&
    directEntryFees.length !== entryFeeIds.length;
  const visibleLocationSelectionStep =
    entryFeeIds.length &&
      (directEntryFeeLocation || isDirectEntryFeeUnavailable)
      ? 2
      : locationSelectionStep;
  const directEntryFeeGroup =
    directEntryFees.length && !isDirectEntryFeeModalDismissed
      ? {
        venueId: directEntryFees[0].venueId || directEntryFees[0].placeId,
        venueName: directEntryFees[0].venueName,
        entryFees: directEntryFees,
      }
      : null;
  const activeEntryFeeGroup = selectedEntryFeeGroup || directEntryFeeGroup;
  const visibleEntryFees = selectedLocation?.entryFees || [];
  const entryFeeGroups = visibleEntryFees.reduce((groups, entryFee) => {
    if (entryFeeIds.length && !entryFeeIds.includes(entryFee.id)) return groups;
    const venueId = entryFee.venueId || entryFee.placeId;
    const group = groups.find((item) => item.venueId === venueId);

    if (group) {
      group.entryFees.push(entryFee);
    } else {
      groups.push({
        venueId,
        venueName: entryFee.venueName,
        entryFees: [entryFee],
      });
    }

    return groups;
  }, []);

  const startBookingForEntryFee = (selectedEntryFees) => {
    const firstEntryFee = selectedEntryFees[0];
    const venue = selectedLocation?.venues?.find(
      (item) => item.id === (firstEntryFee.venueId || firstEntryFee.placeId),
    );

    if (!venue) {
      setBookingError("The venue for this entry fee could not be found.");
      return;
    }

    setBookingError("");
    dispatch(resetBooking());
    dispatch(setCurrentPlace(venue));
    dispatch(
      setTickets(
        Object.fromEntries(
          selectedEntryFees.map(({ id, quantity }) => [id, quantity]),
        ),
      ),
    );
    setEntryFeeVenueId(venue.id);
    setSelectedEntryFeeGroup(null);
    setIsDirectEntryFeeModalDismissed(true);
    setSelectedLocationId(selectedLocation.id);
    setLocationConfirmed(true);

    // Entry fee ke baad direct Visitor Details form
    setStep(3);
  };

  const startBookingForVenue = (venue) => {
    setBookingError("");
    dispatch(resetBooking());
    dispatch(setCurrentPlace(venue));
    setEntryFeeVenueId(null);
    setLocationConfirmed(true);
  };

  // ============================================================
  // SCROLL CONTROL
  // ============================================================
  useEffect(() => {
    const rightSection = document.querySelector(".booking-right-scroll");
    if (!rightSection) return;

    const isDesktop = window.innerWidth >= 1024;

    if (isDesktop) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      rightSection.style.overflowY = step === 0 ? "hidden" : "auto";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      rightSection.style.overflowY = "";
    }

    const handleResize = () => {
      const isNowDesktop = window.innerWidth >= 1024;
      if (isNowDesktop) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        rightSection.style.overflowY = step === 0 ? "hidden" : "auto";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        rightSection.style.overflowY = "";
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      rightSection.style.overflowY = "";
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [step]);

  // ============================================================
  // FINAL BOOKING
  // ============================================================
  const handleFinalBooking = async (visitorInfo) => {
    try {
      setBookingError("");
      const paymentMethod = entryFeeVenueId
        ? "ONLINE"
        : isLoggedIn
          ? visitorInfo?.paymentMethod
          : "ONLINE";

      if (!["CASH", "UPI", "ONLINE"].includes(paymentMethod)) {
        throw new Error("Please select a valid payment method");
      }

      if (!isLoggedIn && paymentMethod !== "ONLINE") {
        throw new Error("Guest users can only use online payment");
      }

      if (!placeId) {
        throw new Error("Place information is not available");
      }

      // if (!locationConfirmed || !selectedLocationId) {
      //   throw new Error("Please select a location before booking");
      // }

      const isEntryFeeBooking = Boolean(entryFeeVenueId);

      console.log("Entry Fee Venue ID:", entryFeeVenueId);
      console.log("Is Entry Fee Booking:", isEntryFeeBooking);
      console.log("Redux Date:", reduxData?.date);
      console.log("Redux Slot:", reduxData?.slot);

      if (!isEntryFeeBooking) {
        if (!reduxData?.date || !reduxData?.slot?.time) {
          throw new Error("Please select a valid date and slot");
        }
      }


      const tickets = Object.entries(reduxData?.tickets || {})
        .filter(([, quantity]) => Number(quantity) > 0)
        .map(([typeId, quantity]) => ({
          typeId,
          quantity: Number(quantity),
        }));

      if (
        tickets.length === 0 ||
        tickets.some(
          (ticket) =>
            !Number.isSafeInteger(ticket.quantity) ||
            ticket.quantity <= 0
        )
      ) {
        throw new Error("Please select valid ticket quantities");
      }


      if (!tickets.length) {
        throw new Error("Please select at least one ticket");
      }

      const slotDateTime = isEntryFeeBooking
        ? null
        : `${reduxData.date}T${reduxData.slot.time}:00.000Z`;

      const totalSeats = tickets.reduce(
        (total, ticket) => total + Number(ticket.quantity),
        0,
      );

      const selectedLocationDetails =
        bookingLocations.find(
          (location) =>
            String(location._id ?? location.id) ===
            String(selectedLocationId)
        ) ||
        (String(directEntryFeeLocation?._id ?? directEntryFeeLocation?.id) ===
          String(selectedLocationId)
          ? directEntryFeeLocation
          : null);

      if (!selectedLocationDetails) {
        throw new Error("Selected location details not found");
      }


      const payload = {
        placeId,
        locationId: selectedLocationId,
        slotDateTime: isEntryFeeBooking ? null : slotDateTime,
        name: visitorInfo?.name,
        email: visitorInfo?.email,
        phone: visitorInfo?.phone,
        paymentMethod,
        bookingType: isEntryFeeBooking ? "ENTRY_FEE" : "TICKET",
        totalAmount: Number(reduxData?.totalAmount || 0),
        totalSeats,
        tickets,
      };


      const res = await createBooking(payload);

      if (!res?.success) {
        throw new Error(res?.message || "Booking failed");
      }

      const bookingId =
        res?.data?.bookingId || res?.data?.booking?.id || res?.data?.id;

      if (paymentMethod === "CASH") {
        if (!bookingId) {
          throw new Error("Booking ID not received");
        }
        router.push(`/payment-success?bookingId=${bookingId}`);
        return;
      }

      if (paymentMethod === "UPI") {
        if (!bookingId) {
          throw new Error("Booking ID not received");
        }
        router.push(`/payment-success?bookingId=${bookingId}`);
        return;
      }

      if (paymentMethod === "ONLINE") {
        const paymentData = res?.data?.payment;

        if (
          !paymentData?.atomTokenId ||
          !paymentData?.merchId ||
          !paymentData?.checkoutJsUrl ||
          !paymentData?.returnUrl
        ) {
          throw new Error("ATOM checkout details were not received");
        }
        if (typeof window.AtomPaynetz !== "function") {
          await loadAtomCheckoutScript(paymentData.checkoutJsUrl);
        }

        if (!window.AtomPaynetz) {
          throw new Error("ATOM checkout is unavailable");
        }

        new window.AtomPaynetz(
          {
            atomTokenId: paymentData.atomTokenId,
            merchId: paymentData.merchId,
            custEmail: paymentData.custEmail,
            custMobile: paymentData.custMobile,
            returnUrl: paymentData.returnUrl,
          },
          paymentData.environment === "PROD" ? "prod" : "uat",
        );
        return;
      }
    } catch (error) {
      console.error("Booking Error:", error);
      const errorMessage =
        error?.response?.data?.message || error?.message || "";
      setBookingError(
        /ATOM|payment gateway/i.test(errorMessage)
          ? "Payment gateway is not integrated/configured yet. Please contact the administrator."
          : errorMessage || "Booking failed. Please try again.",
      );
    }
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <div
      className="
        booking-right-scroll
        bg-[#f8f4ed]
        relative
        w-full
        lg:h-full
        lg:min-h-0
        lg:border-l
        border-gold/10
        overflow-x-hidden
      "
    >
      <div
        className="
          w-full
          max-w-2xl
          mx-auto
          lg:min-h-full
          px-4
          py-6
          sm:px-6
          sm:py-8
          md:px-8
          md:py-10
          lg:px-12
          xl:px-16
          flex
          flex-col
        "
      >
        {step > 0 && <StepIndicator currentStep={step} />}

        <AnimatePresence mode="wait">
          {step > 0 && !isPlaceLoaded ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="
                flex
                flex-1
                min-h-75
                items-center
                justify-center
                font-serif
                text-royal-blue/70
              "
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className="
                    w-10
                    h-10
                    border-4
                    border-gold/20
                    border-t-royal-blue
                    rounded-full
                    animate-spin
                    shadow-sm
                  "
                />
                <p
                  className="
                    text-[10px]
                    sm:text-xs
                    uppercase
                    tracking-[2px]
                    sm:tracking-widest
                    font-bold
                    text-center
                  "
                >
                  Synchronizing Gateway...
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="w-full flex-1 flex flex-col min-h-0">
              {renderStep(step, {
                setStep,
                handleFinalBooking,
                reduxData,
                isSubmitting,
                isLoggedIn,
                entryFeeVenueId,
              })}
              {bookingError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
                >
                  {bookingError}
                </p>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {!locationConfirmed && (
        <div
          className="fixed inset-0 z-2000 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-location-title"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            {visibleLocationSelectionStep === 1 ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#994113]">
                  Booking location
                </p>
                <h2
                  id="booking-location-title"
                  className="mt-2 text-2xl font-bold text-slate-900"
                >
                  Select your location
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Choose a location to continue with this booking.
                </p>

                {isLoadingLocations ? (
                  <p className="mt-6 text-sm text-slate-500">
                    Loading available locations...
                  </p>
                ) : hasLocationError ? (
                  <div className="mt-6">
                    <p className="text-sm text-red-600">
                      Locations could not be loaded. Please try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchLocations()}
                      className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Retry
                    </button>
                  </div>
                ) : bookingLocations.length === 0 ? (
                  <p className="mt-6 text-sm text-red-600">
                    No active locations are available for booking. Please
                    contact support.
                  </p>
                ) : (
                  <label
                    htmlFor="booking-location"
                    className="mt-6 block text-sm font-semibold text-slate-700"
                  >
                    Location <span className="text-red-600">*</span>
                    <select
                      id="booking-location"
                      value={selectedLocationId}
                      onChange={(event) => {
                        setSelectedLocationId(event.target.value);
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal outline-none focus:border-[#994113] focus:ring-2 focus:ring-[#994113]/20"
                    >
                      <option value="">Choose a location</option>
                      {bookingLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {[location.name, location.city, location.state]
                            .filter(Boolean)
                            .join(", ")}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  disabled={!selectedLocationId || isLoadingLocations}
                  onClick={() => setLocationSelectionStep(2)}
                  className="mt-6 w-full rounded-xl bg-linear-to-r from-jaipur-dark to-[#994113] px-5 py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#994113]">
                  {selectedLocation?.name || "Booking location"}
                </p>
                <h2
                  id="booking-location-title"
                  className="mt-2 text-2xl font-bold text-slate-900"
                >
                  Choose what to book
                </h2>
                {bookingError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
                  >
                    {bookingError}
                  </p>
                )}
                {isDirectEntryFeeUnavailable && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
                  >
                    This entry fee is unavailable for booking.
                  </p>
                )}

                <div
                  className={`mt-5 grid gap-5 ${entryFeeId ? "grid-cols-1" : "md:grid-cols-2"
                    }`}
                >
                  {!entryFeeId && (
                    <section className="min-w-0">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Landmark size={16} className="text-[#994113]" />
                        Venues
                      </h3>
                      {selectedLocation?.venues?.length ? (
                        <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                          {selectedLocation.venues.map((venue) => (
                            <button
                              key={venue.id}
                              type="button"
                              onClick={() => startBookingForVenue(venue)}
                              className="group w-full rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#994113]/50 hover:shadow-md"
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span className="flex min-w-0 items-start gap-3">
                                  <span className="rounded-xl bg-[#994113]/10 p-2 text-[#994113]">
                                    <Landmark size={18} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate font-bold text-slate-800">
                                      {venue.name}
                                    </span>
                                    {venue.location && (
                                      <span className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                                        <MapPin size={12} />
                                        {venue.location}
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <ArrowRight
                                  size={16}
                                  className="mt-1 shrink-0 text-slate-400 transition-colors group-hover:text-[#994113]"
                                />
                              </span>
                              <span className="mt-4 block text-xs font-bold text-[#994113]">
                                Browse venue tickets
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          No venues are configured for this location yet.
                        </p>
                      )}
                    </section>
                  )}

                  <section className="min-w-0">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Ticket size={16} className="text-[#994113]" />
                      Entry fees
                    </h3>
                    {entryFeeGroups.length ? (
                      <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                        {entryFeeGroups.map((group) => (
                          <button
                            key={group.venueId}
                            type="button"
                            onClick={() => {
                              setSelectedEntryFeeGroup(group);
                              setSelectedEntryFeeQuantities(
                                Object.fromEntries(
                                  group.entryFees.map(({ id }) => [id, 0]),
                                ),
                              );
                            }}
                            className="group w-full rounded-2xl border border-slate-200 bg-linear-to-br from-white to-amber-50/60 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#994113]/50 hover:shadow-md"
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="flex min-w-0 items-start gap-3">
                                <span className="rounded-xl bg-[#994113]/10 p-2 text-[#994113]">
                                  <Landmark size={18} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-bold text-slate-800">
                                    {group.entryFees
                                      .map((entryFee) => entryFee.name)
                                      .join(", ")}
                                  </span>
                                  <span className="mt-1 block truncate text-xs text-slate-500">
                                    Entry fee:{" "}
                                    {group.entryFees
                                      .map((entryFee) =>
                                        Number(entryFee.price) === 0
                                          ? "Free"
                                          : `₹${entryFee.price}`,
                                      )
                                      .join(" · ")}
                                  </span>
                                </span>
                              </span>
                              <ArrowRight
                                size={16}
                                className="mt-1 shrink-0 text-slate-400 transition-colors group-hover:text-[#994113]"
                              />
                            </span>
                            <span className="mt-4 flex items-center justify-between text-xs font-bold text-[#994113]">
                              Choose ticket type
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                        No entry fees are configured for this location yet.
                      </p>
                    )}
                  </section>
                </div>

                {!entryFeeId && (
                  <div className="mt-6 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setLocationSelectionStep(1)}
                      className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back to locations
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeEntryFeeGroup && (
        <div
          className="fixed inset-0 z-2100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="entry-fee-type-title"
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#994113]">
              Entry fee
            </p>
            <h2
              id="entry-fee-type-title"
              className="mt-2 text-xl font-bold text-slate-900"
            >
              Select ticket types and quantities
            </h2>
            <div className="mt-5 grid gap-3">
              {activeEntryFeeGroup.entryFees.map((entryFee) => {
                const quantity = Number(
                  selectedEntryFeeQuantities[entryFee.id] || 0,
                );
                const taxPercent = Number(entryFee.taxPercent || 0);
                const priceWithTax =
                  Math.round(
                    Number(entryFee.price) * (1 + taxPercent / 100) * 100,
                  ) / 100;

                return (
                  <div
                    key={entryFee.id}
                    className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors sm:p-5 ${quantity > 0
                      ? "border-[#994113] bg-amber-50 ring-2 ring-[#994113]/15"
                      : "border-slate-200"
                      }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={quantity > 0}
                        onChange={(event) =>
                          setSelectedEntryFeeQuantities((current) => ({
                            ...current,
                            [entryFee.id]: event.target.checked ? 1 : 0,
                          }))
                        }
                        className="h-5 w-5 shrink-0 accent-[#994113]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-slate-800 sm:text-lg">
                          {entryFee.name}
                        </span>
                        <span className="mt-1 block text-sm font-bold text-[#994113]">
                          {priceWithTax === 0
                            ? "Free"
                            : `₹${priceWithTax.toFixed(2)}`}
                          {taxPercent > 0 && (
                            <span className="ml-1 text-xs font-medium text-slate-500">
                              incl. {taxPercent}% GST
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                    <label className="shrink-0 text-xs font-medium text-slate-600">
                      Qty
                      <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(event) => {
                          const requestedQuantity = Number(event.target.value);

                          const nextQuantity = Number.isFinite(
                            requestedQuantity,
                          )
                            ? Math.max(0, Math.floor(requestedQuantity))
                            : 0;

                          setSelectedEntryFeeQuantities((current) => ({
                            ...current,
                            [entryFee.id]: nextQuantity,
                          }));
                        }}
                        className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-2 text-center text-base font-semibold text-slate-800 outline-none focus:border-[#994113] focus:ring-2 focus:ring-[#994113]/20"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <span>
                Selected tickets
                <span className="ml-2 text-slate-500">
                  (
                  {activeEntryFeeGroup.entryFees.reduce(
                    (total, entryFee) =>
                      total +
                      Number(selectedEntryFeeQuantities[entryFee.id] || 0),
                    0,
                  )}
                  )
                </span>
              </span>
              <span className="text-[#994113]">
                ₹
                {activeEntryFeeGroup.entryFees
                  .reduce((total, entryFee) => {
                    const taxPercent = Number(entryFee.taxPercent || 0);
                    const unitPrice =
                      Math.round(
                        Number(entryFee.price) * (1 + taxPercent / 100) * 100,
                      ) / 100;
                    return (
                      total +
                      unitPrice *
                      Number(selectedEntryFeeQuantities[entryFee.id] || 0)
                    );
                  }, 0)
                  .toFixed(2)}
              </span>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedEntryFeeGroup(null);
                  setIsDirectEntryFeeModalDismissed(true);
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !Object.values(selectedEntryFeeQuantities).some(
                    (quantity) => Number(quantity) > 0,
                  )
                }
                onClick={() => {
                  const selectedEntryFees = activeEntryFeeGroup.entryFees
                    .filter(
                      (item) => Number(selectedEntryFeeQuantities[item.id]) > 0,
                    )
                    .map((item) => ({
                      ...item,
                      quantity: Number(selectedEntryFeeQuantities[item.id]),
                    }));
                  if (selectedEntryFees.length) {
                    startBookingForEntryFee(selectedEntryFees);
                  }
                }}
                className="rounded-xl bg-linear-to-r from-jaipur-dark to-[#994113] px-5 py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue booking
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && <FullPageLoader message="Generating Secure Ledger..." />}
    </div>
  );
}

// ============================================================
// STEP RENDERER
// ============================================================
function renderStep(step, props) {
  const {
    setStep,
    handleFinalBooking,
    reduxData,
    isSubmitting,
    isLoggedIn,
    entryFeeVenueId,
  } = props;

  switch (step) {
    case 0:
      return <StartStep onNext={() => setStep(1)} />;

    case 1:
      return <DateSelector onNext={() => setStep(2)} />;

    case 2:
      return (
        <TicketCounter
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          tickets={reduxData?.tickets || {}}
          ticketTypeIds={
            entryFeeVenueId ? Object.keys(reduxData?.tickets || {}) : null
          }
        />
      );

    case 3:
      return (
        <VisitorForm
          onSubmit={handleFinalBooking}
          onBack={() =>
            entryFeeVenueId ? setStep(2) : setStep(2)
          }
          showCashOption={entryFeeVenueId ? false : isLoggedIn}
          isSubmitting={isSubmitting}
        />
      );

    default:
      return null;
  }
}

// ============================================================
// START STEP
// ============================================================
const StartStep = ({ onNext }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="
      text-center
      flex
      flex-col
      justify-center
      items-center
      w-full
      max-w-md
      mx-auto
      flex-1
      min-h-125
      sm:min-h-137.5
      lg:min-h-150
      select-none
      py-8
    "
  >
    {/* Images */}
    {/* <div className="relative mb-8 sm:mb-10">
      <div className="absolute inset-0 bg-gold/10 rounded-full blur-xl scale-150 animate-pulse" />
      <div className="absolute inset-0 border border-gold/15 rounded-full animate-ping opacity-20 scale-110" />

      <div
        className="
          relative
          z-10
          w-28
          h-20
          sm:w-40
          sm:h-24
          md:w-48
          md:h-28
          border-2
          border-gold/40
          flex
          items-center
          justify-center
          shadow-2xl
          rounded-xl
          overflow-hidden
          transition-transform
          duration-300
          hover:scale-105
        "
      >
        
        <img
          src="/images/logo.jpeg"
          alt="Place Image"
          className="h-full w-full object-cover"
        />
      </div>
    </div> */}

    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onNext}
      className="
        w-full
        max-w-xs
        bg-linear-to-r
        from-jaipur-dark
        to-[#994113]
        text-white
        rounded-xl
        font-bold
        font-serif
        text-xs
        sm:text-sm
        tracking-[2px]
        sm:tracking-[3px]
        uppercase
        shadow-[0_10px_25px_rgba(153,65,19,0.3)]
        flex
        items-center
        justify-center
        gap-2
        group
        transition-all
        duration-300
        cursor-pointer
        py-4
        sm:py-5
        px-5
      "
    >
      Book Ticket
      <ArrowRight
        size={18}
        className="group-hover:translate-x-1 transition-transform shrink-0"
      />
    </motion.button>

    <div
      className="
        mt-8
        sm:mt-10
        md:mt-12
        flex
        items-center
        justify-center
        gap-1.5
        text-[8px]
        sm:text-[9px]
        uppercase
        tracking-[2px]
        sm:tracking-[3px]
        text-gray-400
        font-bold
        font-sans
        text-center
      "
    >
      <Lock size={10} className="text-gold shrink-0" />
      <span>Authorized State Booking Gateway</span>
    </div>

    {/* <div className="mt-6 sm:mt-8 pt-5 border-t border-gray-200/70 w-full max-w-xs">
      <p
        className="
          text-[9px]
          sm:text-[10px]
          uppercase
          tracking-[2px]
          text-gray-500
          font-bold
          mb-3
        "
      >
        For Enquiries
      </p>

      <div
        className="
          flex
          flex-col
          sm:flex-row
          items-center
          justify-center
          gap-2
          sm:gap-4
        "
      >
        <a
          href="mailto:springfieldschool.events@gmail.com"
          className="
            text-[11px]
            sm:text-xs
            text-jaipur-dark
            font-semibold
            hover:text-[#994113]
            transition-colors
            break-all
          "
        >
          springfieldschool.events@gmail.com
        </a>

        <span className="hidden sm:block text-gray-300">|</span>

        <a
          href="tel:+919999999999"
          className="
            text-[11px]
            sm:text-xs
            text-jaipur-dark
            font-semibold
            hover:text-[#994113]
            transition-colors
            whitespace-nowrap
          "
        >
          +91 90249 24594 <br /> +91 78785 49539
        </a>
      </div>
    </div> */}
  </motion.div>
);

// ============================================================
// STEP INDICATOR
// ============================================================
const StepIndicator = ({ currentStep }) => {
  const stepLabels = ["Date", "Tickets", "Details"];

  return (
    <div className="w-full max-w-md mx-auto shrink-0 mb-6 sm:mb-8 pt-1">
      <div className="flex justify-between items-center gap-2 mb-2">
        {stepLabels.map((label, index) => (
          <span
            key={index}
            className={`
              text-[8px]
              sm:text-[10px]
              md:text-[11px]
              uppercase
              tracking-[1px]
              sm:tracking-widest
              font-bold
              transition-colors
              duration-300
              text-center
              flex-1
              ${currentStep >= index + 1 ? "text-jaipur-dark" : "text-gray-300"}
            `}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex justify-between gap-1 sm:gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`
              h-1
              w-full
              rounded-full
              transition-colors
              duration-500
              ${currentStep >= s ? "bg-jaipur-dark shadow-sm" : "bg-gray-100"}
            `}
          />
        ))}
      </div>
    </div>
  );
};

const LoadingOverlay = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="
      absolute
      inset-0
      bg-white/85
      backdrop-blur-sm
      flex
      flex-col
      items-center
      justify-center
      z-50
      px-5
    "
  >
    <div
      className="
        w-10
        h-10
        sm:w-12
        sm:h-12
        border-4
        border-gold/30
        border-t-royal-blue
        rounded-full
        animate-spin
        mb-4
        shadow-lg
      "
    />

    <p
      className="
        font-serif
        font-bold
        text-xs
        sm:text-sm
        tracking-[2px]
        sm:tracking-widest
        text-royal-blue
        uppercase
        animate-pulse
        text-center
      "
    >
      Generating Secure Ledger...
    </p>
  </motion.div>
);
