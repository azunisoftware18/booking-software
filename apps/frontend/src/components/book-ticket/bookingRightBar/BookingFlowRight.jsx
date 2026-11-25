"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { usePlace } from "@/hooks/useCurrentPlace";
import { useBookingMutation } from "@/hooks/useBookingMutation";
import { useBookingLocations } from "@/hooks/useBookingLocations";
import { useSlots } from "@/hooks/useSlot";
import { setCurrentPlace } from "@/store/slices/placeSlice";
import {
  resetBooking,
  setDate,
  setSlot,
  setTickets,
  setTotalAmount,
} from "@/store/slices/bookingSlice";
import DateSelector from "./bookingParts/DateSelector";
import TicketCounter from "./bookingParts/TicketCounter";
import VisitorForm from "./bookingParts/VisitorForm";
import { ANNEXURE_OPTIONS } from "@/lib/placeAnnexures";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Landmark,
  Lock,
  MapPin,
  Ticket,
} from "lucide-react";
import FullPageLoader from "@/components/ui/FullPageLoader";

let atomCheckoutScriptPromise;

const GROUP_STUDENT_TICKET_NAME = "Group of Student**";
const MIN_GROUP_STUDENT_QUANTITY = 10;
const VENUE_TERMS = [
  "कार्यक्रम हेतु हॉल / मंच नियत तिथि एवं समय को खाली होने पर ही बुक किया जा सकेगा। कार्यक्रम का समय प्रातः 09:00 बजे से रात्रि 08:00 के मध्य ही रखा जाना होगा एवं कार्यक्रम समय के पश्चात् 1 घण्टे में स्थान पूरी तरह खाली किया जाना होगा अन्यथा आगामी दिवस का शुल्क धरोहर राशि में से वसूल किया जाएगा।",
  "बुकिंग हेतु निर्धारित नकद राशि कार्यक्रम शुरू होने से पूर्व बुकिंग विण्डो / कैशियर / online के पास जमा करानी होगी।",
  "विज्ञान उद्यान के मेन गेट पर संस्था/विद्यालय के एक प्रतिनिधि को कार्यक्रम के दौरान मौजूद रहना होगा एवं सुरक्षा प्रहरी के साथ निमन्त्रण पत्र चैक करने होंगे।",
  "कार्यक्रम के आगन्तुक विज्ञान उद्यान में भ्रमण करना चाहे तो निर्धारित टिकट प्राप्त करके ही भ्रमण कर सकेंगे।",
  "संस्था/विद्यालय छात्र/व्यक्तियों द्वारा केन्द्र में किसी प्रकार का लड़ाई–झगड़ा अथवा अनुशासनहीनता नहीं बरती जायेगी। यदि किसी प्रकार की कोई दुर्घटना घटित होती है तो संस्था/विद्यालय स्वयं जिम्मेदार होगा।",
  "कार्यक्रम आयोजित करने सम्बन्धित समस्त जिम्मेदारी आयोजक की होगी स्थल की क्षमता से अधिक लोगों को आमंत्रित नहीं किया जाए। क्षमता से अधिक लोगों को प्रवेश देने से रोकने का अधिकार विभाग के पास सुरक्षित रहेगा।",
  "कार्यक्रम हेतु आयोजक द्वारा जारी निमंत्रण पत्र/प्रवेश कूपन धारक लोगों को ही परिसर में प्रवेश दिया जाएगा। आयोजक द्वारा निमंत्रण पत्र पर स्पष्ट रूप से प्रति कार्ड स्वीकृत व्यक्तियों की संख्या (जैसे 2 व्यक्तियों हेतु) लिखनी होगी।",
  "कार्यक्रम के दौरान पेयजल आदि की व्यवस्था एवं विद्युत आपूर्ति चले जाने की वैकल्पिक व्यवस्था आयोजक को करना होगा।",
  "कार्यक्रम की सूचना पुलिस विभाग/नगर निगम/फायर ब्रिगेड आदि संबंधित ऑथोरिटी जो भी नियमानुसार आवश्यक हो।",
  "कार्यक्रम की प्रकृति अनुसार दुर्घटना, आग आदि से बचाव, फर्स्ट–एड आदि का उपाय कार्यक्रम के दौरान आयोजक को स्वयं करना होगा। पार्किंग सुविधा उद्यान परिसर में उपलब्ध नहीं है। इस हेतु आयोजक द्वारा बाहर व्यवस्था करनी होगी।",
  "राजकीय हित में अथवा अन्य अपरिहार्य कारणों से बुकिंग निरस्त किये जाने का अधिकार विभाग के पास सुरक्षित है जिसके हर्जे–खर्चे का जिम्मेदार विभाग नहीं होगा।",
  "आयोजक द्वारा कार्यक्रम स्थल का पूर्व में अवलोकन कर, स्थल पर लगी सामग्री की स्थिति का आंकलन कर लिया जाना चाहिए। विद्युत हेतु डी.जी.सैट की सुविधा उपलब्ध नहीं है, विद्युत व्यवधान की दशा में आयोजक को स्वयं व्यवस्था करनी होगी।",
  "ऑडिटोरियम में लगे फोटो / बैनर पर फर्म अपना बैनर आदि न लगावें। चिपकाने हेतु कहीं भी डबल साइड टेप काम में न लें।",
  "धरोहर राशि व आयोजन शुल्क अग्रिम जमा होगा। प्राप्त किराया लौटाया नहीं जाएगा चाहे कार्यक्रम आयोजित हो अथवा नहीं।",
  "संबंधित संस्था को कार्यक्रम समाप्ति के पश्चात् अगले दो दिन में धरोहर राशि पुनः प्राप्त करनी होगी। धरोहर राशि हेतु एक रजिस्टर संधारित किया जायेगा, जिसमें संस्था प्रतिनिधि के हस्ताक्षर होंगे इस हेतु अलग से GA-55 प्रारूप में रसीद जारी नहीं की जाएगी। धरोहर राशि नगद जमा करवाई जा सकती है।",
  "कार्यक्रम के दौरान यदि कोई हानि होती है तो धरोहर राशि से हानि की प्रतिपूर्ति की जा सकेगी। हानि के आंकलन के सम्बंध में विभाग का निर्णय अन्तिम होगा।",
  "गतिविधि आयोजन हेतु चिन्हित स्थानों पर अलग–अलग विद्युत मीटर (सब मीटर) लगे हुए हैं। इनकी मीटर रीडिंग हेतु, रजिस्टर संधारित किया गया है। फर्म को कार्यक्रम शुरू होने से पूर्व एवं बाद में रीडिंग नोट कर लेनी चाहिये। बाद में इस पर कोई विवाद स्वीकार्य नहीं होगा।",
  "संबंधित संस्था से गत माह / अन्तिम विद्युत बिल की कुल राशि के आधार पर प्रति यूनिट औसत राशि की गणना कर सब मीटर में विद्युत उपभोग की यूनिट के आधार पर, संस्था से प्राप्त की जा कर राजकोष में जमा करवाई जाएगी। वर्तमान में विद्युत उपभोग की राशि रूपये 10.50 प्रति यूनिट निर्धारित की जाती है। विद्युत दरें परिवर्तित होने पर उसी के अनुसार विद्युत प्रभार वसूल किया जावेगा।",
  "कार्यक्रम में फर्म द्वारा पृथक् से डीजे / तेज आवाज का म्यूजिक सिस्टम लगाना मना है। सांस्कृतिक कार्यक्रम में डांस आदि संयमित रहकर करें। ज्यादा शोर–सीटी बजाना–तेज ताली बजाना, लकड़ी के फ्लोर पर ज्यादा उछलना मना है। इसका उल्लंघन किये जाने पर विभाग द्वारा कार्यक्रम बीच में ही रद्द किया जा सकता है, जिसके लिये फर्म जिम्मेदार होगी। विभाग का फर्नीचर यदि काम में लिया जाता है तो उसे वापस यथास्थान पर फर्म को ही रखना होगा।",
];

const hasRequiredDurationDetails = (item) => {
  if (item.rateMode !== "duration") return true;

  return Boolean(
    item.placeOrSchoolName?.trim() &&
    item.programAddress?.trim() &&
    item.audienceSize !== "" &&
    Number.isSafeInteger(Number(item.audienceSize)) &&
    Number(item.audienceSize) >= 0 &&
    item.staffCount !== "" &&
    Number.isSafeInteger(Number(item.staffCount)) &&
    Number(item.staffCount) >= 0 &&
    item.programType &&
    (item.programType !== "Others" || item.otherProgramType?.trim()) &&
    item.termsAndConditionsAccepted === true,
  );
};

function getEntryFeePriceBreakdown(entryFee) {
  const total = Math.round(Number(entryFee.price) * 100) / 100;
  const taxPercent = Number(entryFee.taxPercent || 0);
  const base =
    taxPercent > 0
      ? Math.round((total / (1 + taxPercent / 100)) * 100) / 100
      : total;
  const tax = Math.round((total - base) * 100) / 100;
  const cgst = Math.round((tax / 2) * 100) / 100;

  return {
    base,
    cgst,
    sgst: Math.round((tax - cgst) * 100) / 100,
    total,
    taxPercent,
  };
}

const SECURITY_DEPOSIT_BY_OPTION = {
  A1: 10000,
  A2: 2500,
  A3: 4000,
  A4: 3000,
  A5: 4000,
  A6: 5500,
  A7: 12000,
};

const ELECTRICITY_CHARGE_BY_OPTION = {
  A1: { 4: 1500, 8: 3000 },
  A2: { 4: 500, 8: 1000 },
  A3: { 4: 200, 8: 400 },
  A4: { 4: 200, 8: 400 },
  A5: { 4: 100, 8: 200 },
  A6: { 4: 1000, 8: 2000 },
  A7: { 4: 1500, 8: 3000 },
};

const mapStaticAnnexurePlaces = (options, annexure, places = []) =>
  options.map((option) => {
    const place = places.find(
      (venue) =>
        String(venue.annexure).trim().toUpperCase() === annexure &&
        String(venue.annexureOption).trim().toUpperCase() === option.value,
    );

    return {
      ...option,
      ...place,
      id: place?.id || `unconfigured-${option.value}`,
      annexure,
      annexureOption: option.value,
      name: option.label,
      isConfigured: Boolean(place?.id),
    };
  });

const getBookedDayCount = (item) => {
  if (!item.date || !item.endDate) return 1;

  const start = new Date(`${item.date}T00:00:00.000Z`);
  const end = new Date(`${item.endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || end < start) return 1;

  return Math.floor((end - start) / 86400000) + 1;
};

const parseVenueDate = (value) => {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatVenueDate = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const isMondayDate = (value) => parseVenueDate(value)?.getDay() === 1;

const getNextVenueDate = (date) => {
  const nextDate = new Date(date);
  if (nextDate.getDay() === 1) nextDate.setDate(nextDate.getDate() + 1);
  return formatVenueDate(nextDate);
};

function VenueDatePicker({ value, minDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => parseVenueDate(value) || parseVenueDate(minDate) || new Date(),
  );
  const pickerRef = useRef(null);
  const selectedDate = parseVenueDate(value);
  const earliestDate = parseVenueDate(minDate);
  const todayValue = formatVenueDate(new Date());
  const todayDate = parseVenueDate(todayValue);
  const canSelectToday =
    todayDate.getDay() !== 1 && (!earliestDate || todayDate >= earliestDate);

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

  const selectDate = (date) => {
    onChange(formatVenueDate(date));
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className="relative mt-1">
      <div className="relative">
        <input
          type="text"
          readOnly
          value={selectedDate?.toLocaleDateString("en-US") || ""}
          onClick={() => setIsOpen((open) => !open)}
          className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm"
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
              if (date) selectDate(date);
            }}
            disabled={(date) =>
              date.getDay() === 1 ||
              Boolean(earliestDate && date < earliestDate)
            }
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
              disabled={!canSelectToday}
              onClick={() => selectDate(todayDate)}
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

const getElectricityCharge = (item) =>
  Number(
    ELECTRICITY_CHARGE_BY_OPTION[item.place.annexureOption]?.[
      item.durationHours
    ] || 0,
  );

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
  const [selectedAnnexure, setSelectedAnnexure] = useState(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showVenueTerms, setShowVenueTerms] = useState(false);
  const [annexureDraftItems, setAnnexureDraftItems] = useState({});
  const [annexureBookingItems, setAnnexureBookingItems] = useState(null);
  const [requiresActivityDisclaimer, setRequiresActivityDisclaimer] =
    useState(false);
  const [entryFeeVenueId, setEntryFeeVenueId] = useState(null);
  const [selectedEntryFeeGroup, setSelectedEntryFeeGroup] = useState(null);
  const [isDirectEntryFeeModalDismissed, setIsDirectEntryFeeModalDismissed] =
    useState(false);
  const [selectedEntryFeeQuantities, setSelectedEntryFeeQuantities] = useState(
    () => initialEntryFeeQuantities,
  );
  const [bookingError, setBookingError] = useState("");
  const [showGatewayUnavailable, setShowGatewayUnavailable] = useState(false);

  const dispatch = useDispatch();
  const reduxData = useSelector((state) => state.booking);
  const currentUser = useSelector((state) => state.auth?.user);
  const isLoggedIn = Boolean(currentUser);

  const { currentPlace, placeId, isPlaceLoaded } = usePlace();
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
    bookingLocations.find(
      (location) =>
        String(location._id ?? location.id) === String(selectedLocationId),
    ) || directEntryFeeLocation;

  // const isJaipurLocation = [
  //   selectedLocation?.name,
  //   selectedLocation?.city,
  // ].some((value) => value?.toLowerCase().includes("jaipur"));

  const isAtomGatewayLocation = (location) => {
    const values = [location?.name, location?.city]
      .filter(Boolean)
      .map((value) => value.trim().toLowerCase());

    return values.some(
      (value) =>
        value.includes("jaipur") ||
        value.includes("jodhpur") ||
        value.includes("kota"),
    );
  };

  const isJaipurLocation = [
    selectedLocation?.name,
    selectedLocation?.city,
  ].some((value) => value?.toLowerCase().includes("jaipur"));

  const isAtomPaymentAvailable = isAtomGatewayLocation(selectedLocation);

  const jaipurVenues = isJaipurLocation
    ? mapStaticAnnexurePlaces(
        ANNEXURE_OPTIONS.A,
        "A",
        selectedLocation?.venues,
      ).filter((venue) => venue.isConfigured)
    : [];
  const planetariumPlaces = isJaipurLocation
    ? mapStaticAnnexurePlaces(
        ANNEXURE_OPTIONS.C,
        "C",
        selectedLocation?.venues,
      ).filter((venue) => venue.isConfigured)
    : [];
  const bookingLocationId = selectedLocationId || directEntryFeeLocation?.id;
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
  const getSelectedEntryFeeQuantity = (entryFee) => {
    return Number(selectedEntryFeeQuantities[entryFee.id] || 0);
  };

  const selectedEntryFeeTotals = (activeEntryFeeGroup?.entryFees || []).reduce(
    (totals, entryFee) => {
      const breakdown = getEntryFeePriceBreakdown(entryFee);
      const quantity = getSelectedEntryFeeQuantity(entryFee);

      return {
        base: totals.base + breakdown.base * quantity,
        cgst: totals.cgst + breakdown.cgst * quantity,
        sgst: totals.sgst + breakdown.sgst * quantity,
        total: totals.total + breakdown.total * quantity,
      };
    },
    { base: 0, cgst: 0, sgst: 0, total: 0 },
  );
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

  useEffect(() => {
    const assignedLocationId =
      currentUser?.locationId || currentUser?.location?.id;

    if (
      !["ADMIN", "LOCATION_ADMIN"].includes(currentUser?.role?.roleCode) ||
      !assignedLocationId ||
      entryFeeIds.length > 0 ||
      isLoadingLocations ||
      hasLocationError
    ) {
      return;
    }

    const assignedLocation = bookingLocations.find(
      (location) =>
        String(location.id || location._id) === String(assignedLocationId),
    );

    if (!assignedLocation) return;

    const locationId = String(assignedLocation.id || assignedLocation._id);
    setSelectedLocationId(locationId);
    setLocationSelectionStep(2);

    if (
      String(currentPlace?.bookingLocation?.id || "") !==
      String(assignedLocation.id || assignedLocation._id)
    ) {
      dispatch(
        setCurrentPlace({
          ...(currentPlace || {}),
          bookingLocation: assignedLocation,
        }),
      );
    }
  }, [
    currentUser?.locationId,
    currentUser?.location?.id,
    currentUser?.role?.roleCode,
    entryFeeIds.length,
    bookingLocations,
    isLoadingLocations,
    hasLocationError,
    currentPlace,
    dispatch,
  ]);

  const selectedAnnexureItems = Object.values(annexureDraftItems);
  const annexureRentalTotal = selectedAnnexureItems.reduce(
    (total, item) => total + Number(item.amount || 0) * getBookedDayCount(item),
    0,
  );
  const annexureSecurityDepositTotal = selectedAnnexureItems.reduce(
    (total, item) =>
      total +
      Number(SECURITY_DEPOSIT_BY_OPTION[item.place.annexureOption] || 0),
    0,
  );
  const annexureElectricityTotal = selectedAnnexureItems.reduce(
    (total, item) =>
      total + getElectricityCharge(item) * getBookedDayCount(item),
    0,
  );
  const annexurePayableTotal =
    annexureRentalTotal +
    annexureSecurityDepositTotal +
    annexureElectricityTotal;

  const startBookingForEntryFee = (selectedEntryFees) => {
    const firstEntryFee = selectedEntryFees[0];
    const venueId = firstEntryFee.venueId || firstEntryFee.placeId;
    const venue =
      selectedLocation?.venues?.find(
        (item) => String(item.id || item._id) === String(venueId),
      ) || firstEntryFee.place;

    if (!venue || String(venue.id || venue._id) !== String(venueId)) {
      setBookingError("The venue for this entry fee could not be found.");
      return;
    }

    setBookingError("");
    dispatch(resetBooking());
    dispatch(
      setCurrentPlace({
        ...venue,
        bookingLocation: selectedLocation,
      }),
    );
    dispatch(
      setTickets(
        Object.fromEntries(
          selectedEntryFees.map(({ id, quantity }) => [id, quantity]),
        ),
      ),
    );
    setRequiresActivityDisclaimer(false);
    setEntryFeeVenueId(venue.id);
    setSelectedEntryFeeGroup(null);
    setIsDirectEntryFeeModalDismissed(true);
    // setSelectedLocationId(selectedLocation.id);
    setSelectedLocationId(String(selectedLocation._id ?? selectedLocation.id));
    setLocationConfirmed(true);

    setStep(3);
  };

  const startBookingForAnnexureOptions = () => {
    const selectedItems = Object.values(annexureDraftItems);
    if (
      !selectedItems.length ||
      selectedItems.some(
        (item) =>
          !item.slotDateTime ||
          (item.rateMode === "duration" && !item.durationHours) ||
          !hasRequiredDurationDetails(item) ||
          (item.endDate && item.endDate < item.date) ||
          (item.rateMode === "headcount" &&
            Number(item.persons || 0) + Number(item.students || 0) < 1),
      )
    ) {
      return;
    }

    const firstItem = selectedItems[0];
    const totalAmount = selectedItems.reduce((total, item) => {
      const days = getBookedDayCount(item);
      return (
        total +
        (Number(item.amount || 0) + getElectricityCharge(item)) * days +
        Number(SECURITY_DEPOSIT_BY_OPTION[item.place.annexureOption] || 0)
      );
    }, 0);
    const bookingItems = selectedItems.map((item) => ({
      placeId: item.place.id,
      slotDateTime: item.slotDateTime,
      slotEndTime: item.slot?.endTimeValue || null,
      endDate: item.endDate || null,
      durationHours: item.durationHours || null,
      persons: Number(item.persons || 0),
      students: Number(item.students || 0),
      ...(item.rateMode === "duration"
        ? {
            placeOrSchoolName: item.placeOrSchoolName.trim(),
            programAddress: item.programAddress.trim(),
            audienceSize: Number(item.audienceSize),
            staffCount: Number(item.staffCount),
            programType: item.programType,
            otherProgramType: item.otherProgramType.trim(),
            vipPersonName: item.vipPersonName.trim(),
            vipPersonPosition: item.vipPersonPosition.trim(),
            termsAndConditionsAccepted: true,
          }
        : {}),
    }));

    setBookingError("");
    dispatch(resetBooking());
    dispatch(
      setCurrentPlace({
        ...firstItem.place,
        bookingLocation: selectedLocation,
      }),
    );
    dispatch(setDate(firstItem.date));
    dispatch(setSlot(firstItem.slot));
    dispatch(setTotalAmount(totalAmount));
    setAnnexureBookingItems(bookingItems);
    setRequiresActivityDisclaimer(firstItem.place.annexure === "C");
    setEntryFeeVenueId(null);
    setSelectedAnnexure(null);
    setLocationConfirmed(true);
    setStep(3);
  };

  const returnToAnnexureSelection = () => {
    setLocationConfirmed(false);
    setLocationSelectionStep(2);
    setAnnexureBookingItems(null);
    setRequiresActivityDisclaimer(false);
    setSelectedAnnexure(null);
    setShowDepositForm(false);
    setShowVenueTerms(false);
    setAnnexureDraftItems({});
    setStep(0);
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
      const paymentMethod = isLoggedIn ? visitorInfo?.paymentMethod : "ONLINE";

      if (!["CASH", "UPI", "ONLINE"].includes(paymentMethod)) {
        throw new Error("Please select a valid payment method");
      }

      if (!isLoggedIn && paymentMethod !== "ONLINE") {
        throw new Error("Guest users can only use online payment");
      }

      // if (paymentMethod === "ONLINE" && !isJaipurLocation) {
      //   setShowGatewayUnavailable(true);
      //   return;
      // }

      if (paymentMethod === "ONLINE" && !isAtomPaymentAvailable) {
        setShowGatewayUnavailable(true);
        return;
      }

      if (!placeId) {
        throw new Error("Place information is not available");
      }

      // if (!locationConfirmed || !selectedLocationId) {
      //   throw new Error("Please select a location before booking");
      // }

      const isEntryFeeBooking = Boolean(entryFeeVenueId);
      const isAnnexureBooking = Boolean(annexureBookingItems?.length);

      if (
        requiresActivityDisclaimer &&
        visitorInfo?.activityDisclaimerAccepted !== true
      ) {
        throw new Error("Please acknowledge the activity booking disclaimer.");
      }

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
        (!isAnnexureBooking && tickets.length === 0) ||
        tickets.some(
          (ticket) =>
            !Number.isSafeInteger(ticket.quantity) || ticket.quantity <= 0,
        )
      ) {
        throw new Error("Please select valid ticket quantities");
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
            String(location._id ?? location.id) === String(selectedLocationId),
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
        phone: visitorInfo?.phone,
        paymentMethod,
        bookingType: isAnnexureBooking
          ? "ANNEXURE"
          : isEntryFeeBooking
            ? "ENTRY_FEE"
            : "TICKET",
        totalAmount: Number(reduxData?.totalAmount || 0),
        totalSeats,
        tickets: isAnnexureBooking ? [] : tickets,
        ...(isAnnexureBooking ? { annexureItems: annexureBookingItems } : {}),
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
            custMobile: paymentData.custMobile,
            returnUrl: paymentData.returnUrl,
          },
          paymentData.environment === "PROD" ? "prod" : "uat",
        );
        return;
      }
    } catch (error) {
      console.error("[BOOKING ERROR]", error);

      console.error("[BOOKING ERROR DETAILS]", {
        message: error?.message,
        status: error?.response?.status,
        responseData: error?.response?.data,
      });

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Booking failed. Please try again.";

      setBookingError(errorMessage);
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
                annexureBookingItems,
                requiresActivityDisclaimer,
                onAnnexureBack: returnToAnnexureSelection,
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
                        const nextLocationId = event.target.value;
                        const nextLocation = bookingLocations.find(
                          (location) => location.id === nextLocationId,
                        );

                        setSelectedLocationId(nextLocationId);

                        if (nextLocation) {
                          dispatch(
                            setCurrentPlace({
                              ...(currentPlace || {}),
                              bookingLocation: nextLocation,
                            }),
                          );
                        }
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
                  className={`mt-5 grid gap-5 ${
                    entryFeeId
                      ? "grid-cols-1"
                      : isJaipurLocation && !entryFeeIds.length
                        ? "md:grid-cols-3"
                        : "md:grid-cols-2"
                  }`}
                >
                  {!entryFeeId &&
                    isJaipurLocation &&
                    !entryFeeIds.length &&
                    planetariumPlaces.length > 0 && (
                      <section className="min-w-0">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Landmark size={16} className="text-[#994113]" />
                          Venues
                        </h3>
                        {jaipurVenues.length ? (
                          <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                            {jaipurVenues.map((venue) => (
                              <button
                                key={venue.id}
                                type="button"
                                disabled={!venue.isConfigured}
                                onClick={() => {
                                  if (!venue.isConfigured) return;
                                  setAnnexureDraftItems({});
                                  setShowDepositForm(false);
                                  setShowVenueTerms(false);
                                  setSelectedAnnexure({
                                    annexure: "A",
                                    venues: [venue],
                                  });
                                }}
                                className="group w-full rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#994113]/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <span className="flex items-start justify-between gap-3">
                                  <span className="flex min-w-0 items-start gap-3">
                                    <span className="rounded-xl bg-[#994113]/10 p-2 text-[#994113]">
                                      <Landmark size={18} />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block font-bold text-slate-800">
                                        {venue.name}
                                      </span>
                                      <span className="mt-1 block text-xs text-slate-500">
                                        {venue.isConfigured
                                          ? "Available for booking"
                                          : "Jaipur Admin setup required"}
                                      </span>
                                    </span>
                                  </span>
                                  <ArrowRight
                                    size={16}
                                    className="mt-1 shrink-0 text-slate-400 transition-colors group-hover:text-[#994113]"
                                  />
                                </span>
                                <span className="mt-3 block text-xs font-bold text-[#994113]">
                                  {venue.isConfigured
                                    ? "Choose venue"
                                    : "Unavailable"}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                            No Annexure options are configured for this location
                            yet.
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

                  {!entryFeeId &&
                    isJaipurLocation &&
                    !entryFeeIds.length &&
                    planetariumPlaces.length > 0 && (
                      <section className="min-w-0">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Ticket size={16} className="text-[#994113]" />
                          Other activities
                        </h3>
                        <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                          {planetariumPlaces.map((venue) => (
                            <button
                              key={venue.id}
                              type="button"
                              onClick={() => {
                                setAnnexureDraftItems({});
                                setShowDepositForm(false);
                                setShowVenueTerms(false);
                                setSelectedAnnexure({
                                  annexure: "C",
                                  venues: [venue],
                                });
                              }}
                              className="group w-full rounded-2xl border border-slate-200 bg-linear-to-br from-white to-amber-50/60 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#994113]/50 hover:shadow-md"
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span className="block min-w-0 font-bold text-slate-800">
                                  {venue.name}
                                </span>
                                <ArrowRight
                                  size={16}
                                  className="mt-1 shrink-0 text-slate-400 transition-colors group-hover:text-[#994113]"
                                />
                              </span>
                              <span className="mt-2 block text-xs text-slate-500">
                                ₹{venue.ratePerPerson} per person · ₹
                                {venue.ratePerStudent} per student
                              </span>
                              <span className="mt-3 block text-xs font-bold text-[#994113]">
                                Choose ticket quantity
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
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

      {selectedAnnexure && (
        <div
          className="fixed inset-0 z-2100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="annexure-options-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#994113]">
              {selectedLocation?.name}
            </p>
            <h2
              id="annexure-options-title"
              className="mt-2 text-xl font-bold text-slate-900"
            >
              {showDepositForm
                ? "Security deposit and electricity"
                : selectedAnnexure.annexure === "C"
                  ? "Other activities "
                  : selectedAnnexure.venues.length === 1
                    ? selectedAnnexure.venues[0].name
                    : "Select venue options"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {showDepositForm ? (
                "Security deposit is charged once; electricity charges are calculated for each booked day."
              ) : selectedAnnexure.annexure === "C" ? (
                <>
                  Select ticket types, visitor quantities, date and slot.
                  <span className="mt-1 block text-sm font-bold text-[#994113]">
                    Entry Fee ticket is mandatory before booking any other
                    activities. Please select your Entry Fee first.
                  </span>
                </>
              ) : (
                "Choose a start date and slot. End date is optional for multi-day bookings."
              )}
            </p>

            <div className="mt-5 space-y-3">
              {showDepositForm
                ? selectedAnnexureItems.map((item) => {
                    const days = getBookedDayCount(item);
                    const securityDeposit = Number(
                      SECURITY_DEPOSIT_BY_OPTION[item.place.annexureOption] ||
                        0,
                    );
                    const electricity = getElectricityCharge(item) * days;

                    return (
                      <section
                        key={item.place.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <h3 className="font-semibold text-slate-800">
                          {item.place.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.date} to {item.endDate || item.date} · {days}{" "}
                          {days === 1 ? "day" : "days"}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                            Security deposit: ₹
                            {securityDeposit.toLocaleString("en-IN")}
                          </p>
                          <p className="text-sm font-semibold text-[#994113]">
                            Electricity Charges Deposits (
                            {item.durationHours || 0} hours × {days}{" "}
                            {days === 1 ? "day" : "days"}): ₹
                            {electricity.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </section>
                    );
                  })
                : selectedAnnexure.venues.map((venue) => (
                    <AnnexureOptionRow
                      key={venue.id}
                      venue={venue}
                      value={annexureDraftItems[venue.id]}
                      onShowTerms={() => setShowVenueTerms(true)}
                      onChange={(nextValue) =>
                        setAnnexureDraftItems((current) => {
                          const next = { ...current };
                          if (nextValue) next[venue.id] = nextValue;
                          else delete next[venue.id];
                          return next;
                        })
                      }
                    />
                  ))}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <span>
                {showDepositForm
                  ? "Total payable"
                  : `${selectedAnnexureItems.length} options selected`}
              </span>
              <span className="text-[#994113]">
                {showDepositForm ? "" : "Rental: "}₹
                {(showDepositForm
                  ? annexurePayableTotal
                  : annexureRentalTotal
                ).toFixed(2)}
              </span>
            </div>

            {showDepositForm && (
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  Venue charges (18 % GST Included): ₹
                  {annexureRentalTotal.toFixed(2)}
                </p>
                <p>
                  Security deposit: ₹{annexureSecurityDepositTotal.toFixed(2)}
                </p>
                <p>
                  Electricity Charges Deposit: ₹
                  {annexureElectricityTotal.toFixed(2)}
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (showDepositForm) setShowDepositForm(false);
                  else {
                    setShowVenueTerms(false);
                    setSelectedAnnexure(null);
                  }
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={
                  !selectedAnnexureItems.length ||
                  (!showDepositForm &&
                    selectedAnnexureItems.some(
                      (item) =>
                        !item.slotDateTime ||
                        item.amount == null ||
                        (item.rateMode === "duration" && !item.durationHours) ||
                        !hasRequiredDurationDetails(item) ||
                        (item.rateMode === "headcount" &&
                          Number(item.persons || 0) +
                            Number(item.students || 0) <
                            1),
                    ))
                }
                onClick={() => {
                  if (selectedAnnexure.annexure === "C" || showDepositForm) {
                    startBookingForAnnexureOptions();
                  } else {
                    setShowDepositForm(true);
                  }
                }}
                className="rounded-xl bg-linear-to-r from-jaipur-dark to-[#994113] px-5 py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedAnnexure.annexure === "C"
                  ? "Book tickets"
                  : showDepositForm
                    ? "Continue booking"
                    : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVenueTerms &&
        selectedAnnexure &&
        selectedAnnexure.annexure !== "C" && (
          <div
            className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-terms-title"
          >
            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <h2
                  id="venue-terms-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Terms and Condition
                </h2>
                <button
                  type="button"
                  onClick={() => setShowVenueTerms(false)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-700">
                {VENUE_TERMS.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ol>
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
                const quantity = getSelectedEntryFeeQuantity(entryFee);
                const breakdown = getEntryFeePriceBreakdown(entryFee);
                const { taxPercent, total: priceWithTax } = breakdown;
                const isGroupQuantityInvalid =
                  entryFee.name === GROUP_STUDENT_TICKET_NAME &&
                  quantity > 0 &&
                  quantity < MIN_GROUP_STUDENT_QUANTITY;

                return (
                  <div
                    key={entryFee.id}
                    className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors sm:p-5 ${
                      isGroupQuantityInvalid
                        ? "border-red-500 bg-red-50 ring-2 ring-red-500/15"
                        : quantity > 0
                          ? "border-[#994113] bg-amber-50 ring-2 ring-[#994113]/15"
                          : "border-slate-200"
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={quantity > 0}
                        onChange={(event) => {
                          setBookingError("");
                          setSelectedEntryFeeQuantities((current) => ({
                            ...current,
                            [entryFee.id]: event.target.checked ? 1 : 0,
                          }));
                        }}
                        className="h-5 w-5 shrink-0 accent-[#994113]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-slate-800 sm:text-lg">
                          {entryFee.name}
                        </span>
                        {entryFee.name === GROUP_STUDENT_TICKET_NAME && (
                          <span className="mt-1 block text-xs font-medium text-slate-500">
                            Minimum booking: {MIN_GROUP_STUDENT_QUANTITY}{" "}
                            tickets
                          </span>
                        )}
                        <span className="mt-1 block text-sm font-bold text-[#994113]">
                          {priceWithTax === 0
                            ? "Free"
                            : `₹${priceWithTax.toFixed(2)}`}
                          {taxPercent > 0 && (
                            <span className="mt-1 block text-xs font-medium text-slate-500">
                              GST included · Base ₹{breakdown.base.toFixed(2)} ·
                              CGST {taxPercent / 2}% ₹
                              {breakdown.cgst.toFixed(2)} · SGST{" "}
                              {taxPercent / 2}% ₹{breakdown.sgst.toFixed(2)}
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                    <div className="shrink-0 text-right">
                      <label className="text-xs font-medium text-slate-600">
                        Qty
                        <input
                          type="number"
                          min={0}
                          value={quantity}
                          onChange={(event) => {
                            setBookingError("");
                            const requestedQuantity = Number(
                              event.target.value,
                            );

                            const requestedValue = Number.isFinite(
                              requestedQuantity,
                            )
                              ? Math.max(0, Math.floor(requestedQuantity))
                              : 0;

                            setSelectedEntryFeeQuantities((current) => ({
                              ...current,
                              [entryFee.id]: requestedValue,
                            }));
                          }}
                          className={`ml-2 w-20 rounded-lg border px-2 py-2 text-center text-base font-semibold text-slate-800 outline-none ${
                            isGroupQuantityInvalid
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                              : "border-slate-300 focus:border-[#994113] focus:ring-2 focus:ring-[#994113]/20"
                          }`}
                        />
                      </label>
                      {isGroupQuantityInvalid && (
                        <p className="mt-1 text-xs font-semibold text-red-600 animate-pulse">
                          Minimum 10 required
                        </p>
                      )}
                    </div>
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
                      total + getSelectedEntryFeeQuantity(entryFee),
                    0,
                  )}
                  )
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  Base ₹{selectedEntryFeeTotals.base.toFixed(2)} · CGST ₹
                  {selectedEntryFeeTotals.cgst.toFixed(2)} · SGST ₹
                  {selectedEntryFeeTotals.sgst.toFixed(2)}
                </span>
              </span>
              <span className="text-[#994113]">
                ₹{selectedEntryFeeTotals.total.toFixed(2)}
              </span>
            </div>
            {bookingError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
              >
                {bookingError}
              </p>
            )}
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
                      quantity: getSelectedEntryFeeQuantity(item),
                    }));
                  const groupStudentTicket = selectedEntryFees.find(
                    (item) => item.name === GROUP_STUDENT_TICKET_NAME,
                  );
                  if (
                    groupStudentTicket &&
                    groupStudentTicket.quantity < MIN_GROUP_STUDENT_QUANTITY
                  ) {
                    return;
                  }
                  if (selectedEntryFees.length) {
                    setBookingError("");
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
      <AnimatePresence>
        {showGatewayUnavailable && (
          <motion.div
            className="fixed inset-0 z-2000 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gateway-unavailable-title"
            aria-describedby="gateway-unavailable-description"
          >
            <motion.div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
            >
              <h2
                id="gateway-unavailable-title"
                className="text-xl font-bold text-royal-blue"
              >
                Payment gateway not integrated yet
              </h2>
              <p
                id="gateway-unavailable-description"
                className="mt-3 text-sm leading-relaxed text-slate-600"
              >
                Online payments for {selectedLocation?.name || "this location"}{" "}
                are temporarily unavailable. Please try again once the payment
                gateway is configured.
              </p>
              <button
                type="button"
                onClick={() => setShowGatewayUnavailable(false)}
                className="mt-6 w-full rounded-xl bg-linear-to-r from-jaipur-dark to-[#994113] px-5 py-3 font-bold text-white"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnnexureOptionRow({ venue, value, onChange, onShowTerms }) {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const defaultVisitDate = getNextVenueDate(now);
  const date = value?.date || defaultVisitDate;
  const durationAnnexures = new Set(["A", "B"]);
  const canUseDurationRates = durationAnnexures.has(
    String(venue.annexure || "")
      .trim()
      .toUpperCase(),
  );
  const hasDurationRates =
    canUseDurationRates &&
    (venue.rate4Hours != null || venue.rate8Hours != null);
  const hasHeadcountRates =
    venue.ratePerPerson != null || venue.ratePerStudent != null;
  const rateMode = hasDurationRates
    ? "duration"
    : hasHeadcountRates
      ? "headcount"
      : "unavailable";
  const isConfigured = venue.isConfigured ?? true;
  const {
    data: slots = [],
    isLoading,
    isError,
    refetch,
  } = useSlots({
    placeId: venue.id,
    date,
    enabled: Boolean(value) && isConfigured,
  });
  const availabilityDate = date;
  const availabilitySlots = slots;
  const durationFilteredSlots =
    rateMode === "duration"
      ? availabilitySlots.filter(
          (slot) =>
            Number(slot.durationMinutes) === Number(value?.durationHours) * 60,
        )
      : availabilitySlots;
  const isLoadingAvailability = isLoading;
  const isAvailabilityError = isError;
  const refetchAvailability = refetch;

  const updateValue = (changes) => {
    const nextValue = {
      ...value,
      ...changes,
      place: venue,
      date: changes.date ?? availabilityDate,
      rateMode,
    };
    if (rateMode === "duration") {
      nextValue.amount =
        nextValue.durationHours === 8 ? venue.rate8Hours : venue.rate4Hours;
      nextValue.persons = 0;
      nextValue.students = 0;
    } else if (rateMode === "headcount") {
      nextValue.durationHours = null;
      nextValue.amount =
        Number(nextValue.persons || 0) * Number(venue.ratePerPerson || 0) +
        Number(nextValue.students || 0) * Number(venue.ratePerStudent || 0);
    } else {
      nextValue.amount = null;
    }

    onChange(nextValue);
  };

  const selectOption = (checked) => {
    if (!isConfigured) return;

    if (!checked) {
      onChange(null);
      return;
    }

    const defaultDuration = venue.rate4Hours != null ? 4 : 8;
    const defaultPersons = venue.ratePerPerson != null ? 1 : 0;
    const defaultStudents = venue.ratePerStudent != null ? 1 : 0;
    const initialAmount =
      rateMode === "duration"
        ? defaultDuration === 4
          ? venue.rate4Hours
          : venue.rate8Hours
        : defaultPersons * Number(venue.ratePerPerson || 0) +
          defaultStudents * Number(venue.ratePerStudent || 0);

    onChange({
      place: venue,
      date: defaultVisitDate,
      endDate: "",
      slot: null,
      slotDateTime: null,
      rateMode,
      durationHours: rateMode === "duration" ? defaultDuration : null,
      persons: defaultPersons,
      students: defaultStudents,
      placeOrSchoolName: "",
      programAddress: "",
      audienceSize: "",
      staffCount: "",
      programType: "",
      otherProgramType: "",
      vipPersonName: "",
      vipPersonPosition: "",
      termsAndConditionsAccepted: false,
      amount: rateMode === "unavailable" ? null : initialAmount,
    });
  };

  return (
    <section
      className={`rounded-xl border p-4 ${
        value
          ? "border-[#994113] bg-amber-50/50 ring-1 ring-[#994113]/15"
          : "border-slate-200"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={!isConfigured}
          onChange={(event) => selectOption(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[#994113]"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-800">
            {venue.annexureOption}: {venue.name}
          </span>
          {!isConfigured && (
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Jaipur Admin setup required for booking
            </span>
          )}
          {venue.shortDescription && (
            <span className="mt-1 block text-xs text-slate-500">
              {venue.shortDescription}
            </span>
          )}
          <span className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-emerald-700">
            {canUseDurationRates && venue.rate4Hours != null && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1">
                4 hours: ₹{Number(venue.rate4Hours).toLocaleString("en-IN")}
              </span>
            )}
            {canUseDurationRates && venue.rate8Hours != null && (
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-800">
                8 hours: ₹{Number(venue.rate8Hours).toLocaleString("en-IN")}
              </span>
            )}
            {venue.ratePerPerson != null && (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-800">
                Per person: ₹
                {Number(venue.ratePerPerson).toLocaleString("en-IN")}
              </span>
            )}
            {venue.ratePerStudent != null && (
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-800">
                Per student: ₹
                {Number(venue.ratePerStudent).toLocaleString("en-IN")}
              </span>
            )}
          </span>
        </span>
      </label>

      {value && (
        <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
          {rateMode === "duration" ? (
            <>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Name of School / Institution*
                <input
                  type="text"
                  required
                  maxLength={191}
                  value={value.placeOrSchoolName}
                  onChange={(event) =>
                    updateValue({ placeOrSchoolName: event.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                Address *
                <textarea
                  required
                  rows={2}
                  maxLength={500}
                  value={value.programAddress}
                  onChange={(event) =>
                    updateValue({ programAddress: event.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                No. of Students/Audience *
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={value.audienceSize}
                  onChange={(event) =>
                    updateValue({ audienceSize: event.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                No. of Staff *
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={value.staffCount}
                  onChange={(event) =>
                    updateValue({ staffCount: event.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Type of Program *
                <select
                  required
                  value={value.programType}
                  onChange={(event) => {
                    const programType = event.target.value;
                    updateValue({
                      programType,
                      otherProgramType:
                        programType === "Others" ? value.otherProgramType : "",
                    });
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select program type</option>
                  <option value="Academic">Academic</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Others">Others</option>
                </select>
              </label>
              {value.programType === "Others" && (
                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Please specify program type *
                  <input
                    type="text"
                    required
                    maxLength={191}
                    value={value.otherProgramType}
                    onChange={(event) =>
                      updateValue({ otherProgramType: event.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              )}
              <label className="text-xs font-semibold text-slate-600">
                VIP Person Name (optional)
                <input
                  type="text"
                  maxLength={191}
                  value={value.vipPersonName}
                  onChange={(event) =>
                    updateValue({ vipPersonName: event.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>

              {value.vipPersonName.trim() && (
                <label className="text-xs font-semibold text-slate-600">
                  VIP Person Position
                  <input
                    type="text"
                    maxLength={191}
                    value={value.vipPersonPosition}
                    onChange={(event) =>
                      updateValue({ vipPersonPosition: event.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              )}

              <label className="text-xs font-semibold text-slate-600">
                Duration
                <select
                  value={value.durationHours}
                  onChange={(event) =>
                    updateValue({
                      durationHours: Number(event.target.value),
                      slot: null,
                      slotDateTime: null,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {venue.rate4Hours != null && (
                    <option value={4}>4 hours</option>
                  )}
                  {venue.rate8Hours != null && (
                    <option value={8}>8 hours</option>
                  )}
                </select>
              </label>
            </>
          ) : rateMode === "headcount" ? (
            <>
              {venue.ratePerPerson != null && (
                <label className="text-xs font-semibold text-slate-600">
                  Persons
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.persons}
                    onChange={(event) =>
                      updateValue({
                        persons: Math.max(
                          0,
                          Math.floor(Number(event.target.value) || 0),
                        ),
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              )}
              {venue.ratePerStudent != null && (
                <label className="text-xs font-semibold text-slate-600">
                  Students
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value.students}
                    onChange={(event) =>
                      updateValue({
                        students: Math.max(
                          0,
                          Math.floor(Number(event.target.value) || 0),
                        ),
                      })
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              )}
            </>
          ) : (
            <p className="text-sm text-red-600">
              Pricing is not configured for this option.
            </p>
          )}

          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            <span className="flex items-center gap-1">
              <CalendarDays size={14} />
              Visit date
            </span>
            <VenueDatePicker
              minDate={today}
              value={availabilityDate}
              onChange={(nextDate) => {
                if (isMondayDate(nextDate)) return;
                onChange({
                  ...value,
                  place: venue,
                  date: nextDate,
                  endDate:
                    value.endDate && value.endDate < nextDate
                      ? ""
                      : value.endDate,
                  slot: null,
                  slotDateTime: null,
                });
              }}
            />
          </label>

          {venue.annexure !== "C" && (
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              End date (optional)
              <VenueDatePicker
                minDate={value.date || availabilityDate}
                value={value.endDate || ""}
                onChange={(endDate) => {
                  if (endDate && isMondayDate(endDate)) return;
                  updateValue({ endDate });
                }}
              />
              <span className="mt-1 block font-normal text-slate-500">
                Leave blank for a one-day booking.
              </span>
            </label>
          )}

          <div className="sm:col-span-2">
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
              <Clock size={14} />
              Select Available slots
            </p>
            {isLoadingAvailability ? (
              <p className="text-sm text-slate-500">
                Loading available slots...
              </p>
            ) : isAvailabilityError ? (
              <div className="text-sm text-red-600">
                Could not load slots.{" "}
                <button
                  type="button"
                  onClick={() => refetchAvailability?.()}
                  className="font-semibold underline"
                >
                  Retry
                </button>
              </div>
            ) : durationFilteredSlots.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {durationFilteredSlots
                  // .filter((slot) => slot.status === "available")
                  .map((slot) => {
                    const isSelected =
                      value.slot?.time === slot.time &&
                      value.slot?.endTime === slot.endTime;
                    const status = String(slot.status ?? slot._status ?? "")
                      .trim()
                      .toLowerCase();

                    const isExpired = status === "expired";

                    const isFull = Number(slot.available ?? 0) <= 0;

                    const isDisabled = isExpired || isFull;
                    return (
                      <button
                        key={`${slot.time}-${slot.endTime}`}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;

                          updateValue({
                            slot,
                            date: availabilityDate,
                            slotDateTime: `${availabilityDate}T${slot.time}:00.000Z`,
                          });
                        }}
                        className={`group relative flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#994113] focus:ring-offset-2 ${
                          isDisabled
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                            : isSelected
                              ? "border-[#994113] bg-[#994113] text-white shadow-md shadow-orange-900/20"
                              : "border-slate-200 bg-white text-slate-800 hover:border-[#994113] hover:bg-orange-50 hover:shadow-sm"
                        }`}
                      >
                        <div className="text-sm font-bold tracking-wide">
                          {slot.startTime || slot.time}-{slot.endTime}
                        </div>

                        <span
                          className={`text-xs font-medium ${
                            isSelected
                              ? "text-orange-100"
                              : "text-slate-500 group-hover:text-[#994113]"
                          }`}
                        >
                          {slot.available} / {slot.capacity} seats
                        </span>

                        {isSelected && (
                          <span className="absolute right-2 top-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 011.414-1.415l2.794 2.794 6.493-6.494a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {rateMode === "duration" && value?.durationHours
                  ? `No ${value.durationHours}-hour slots available for this date.`
                  : "No available slots for this date."}
              </p>
            )}
          </div>

          <p className="text-sm font-bold text-[#994113] sm:col-span-2">
            Option total ({getBookedDayCount(value)}{" "}
            {getBookedDayCount(value) === 1 ? "day" : "days"}): ₹
            {(Number(value.amount || 0) * getBookedDayCount(value)).toFixed(2)}
          </p>
          {rateMode === "duration" && (
            <div className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                id={`terms-accepted-${venue.id}`}
                type="checkbox"
                required
                aria-label="I have read and agree to the Terms and Conditions"
                checked={value.termsAndConditionsAccepted === true}
                onChange={(event) =>
                  updateValue({
                    termsAndConditionsAccepted: event.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#994113]"
              />
              <span>
                I have read and agree to the{" "}
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={onShowTerms}
                  className="font-bold cursor-pointer text-[#994113] underline underline-offset-2 hover:text-[#7a3410]"
                >
                  Terms and Conditions
                </button>
                .
              </span>
            </div>
          )}
        </div>
      )}
    </section>
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
    annexureBookingItems,
    requiresActivityDisclaimer,
    onAnnexureBack,
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
          onBack={() => (entryFeeVenueId ? setStep(2) : setStep(2))}
          showCashOption={isLoggedIn}
          showActivityDisclaimer={requiresActivityDisclaimer}
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
