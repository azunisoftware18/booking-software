
"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { CheckCircle2, XCircle, Search, X } from "lucide-react";

const statusStyle = {
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

const ALLOWED_VENUE_OPTIONS = new Set(["A1", "A2", "A3"]);

const isAllowedVenueBooking = (booking) =>
  (booking.annexureItems || []).some((item) => {
    const place = item.place || {};
    return (
      String(place.annexure || "").toUpperCase() === "A" &&
      ALLOWED_VENUE_OPTIONS.has(
        String(place.annexureOption || "").toUpperCase()
      )
    );
  });

export default function VenueBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [remark, setRemark] = useState({});
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");

  const loadBookings = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get("/booking/venue-reports");
      setBookings(
        (response?.data?.data || []).filter(isAllowedVenueBooking)
      );
    } catch (loadError) {
      setError(
        loadError?.response?.data?.message ||
          "Unable to load venue bookings"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  // Search filtering
  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return bookings;

    return bookings.filter((booking) => {
      const venueNames = (booking.annexureItems || [])
        .map((item) => item.place?.name)
        .filter(Boolean)
        .join(" ");

      const searchableText = [
        booking.id,
        booking.name,
        booking.phone,
        booking.place?.name,
        venueNames,
        booking.status,
        booking.reviewStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [bookings, search]);

  const updateReview = async (bookingId, reviewStatus) => {
    const adminRemark = String(remark[bookingId] || "").trim();

    if (reviewStatus === "REJECTED" && !adminRemark) {
      setError("Remark is required for rejection");
      return;
    }

    setSavingId(bookingId);
    setError("");

    try {
      await api.patch(`/booking/${bookingId}/venue-review`, {
        reviewStatus,
        adminRemark,
      });

      await loadBookings();
    } catch (updateError) {
      setError(
        updateError?.response?.data?.message ||
          "Unable to update booking"
      );
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Venue Booking Report
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Review venue bookings and update their approval status.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, customer, phone, venue..."
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-[#994113] focus:ring-2 focus:ring-[#994113]/10"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading venue bookings...
          </p>
        ) : (
          <>
            <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </div>

            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Venue</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Review</th>
                  <th className="p-4">Remark</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    const reviewStatus =
                      booking.reviewStatus || "UNDER_REVIEW";

                    return (
                      <tr
                        key={booking.id}
                        className="border-b last:border-0"
                      >
                        <td className="p-4 font-semibold text-slate-700">
                          {booking.id.slice(-12).toUpperCase()}
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-slate-800">
                            {booking.name || "Customer"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {booking.phone}
                          </p>
                        </td>

                        <td className="p-4 font-semibold text-slate-700">
                          {booking.annexureItems
                            ?.map((item) => item.place?.name)
                            .filter(Boolean)
                            .join(", ") ||
                            booking.place?.name ||
                            "Venue"}
                        </td>

                        <td className="p-4 text-slate-600">
                          {booking.slotDateTime
                            ? new Date(
                                booking.slotDateTime
                              ).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>

                        <td className="p-4 font-bold text-slate-800">
                          ₹
                          {Number(
                            booking.totalAmount || 0
                          ).toLocaleString("en-IN")}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              booking.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              statusStyle[reviewStatus] ||
                              statusStyle.UNDER_REVIEW
                            }`}
                          >
                            {reviewStatus}
                          </span>
                        </td>

                        <td className="p-4">
                          <input
                            value={
                              remark[booking.id] ??
                              booking.adminRemark ??
                              ""
                            }
                            onChange={(event) =>
                              setRemark((current) => ({
                                ...current,
                                [booking.id]: event.target.value,
                              }))
                            }
                            placeholder="Remark"
                            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#994113]"
                          />
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={savingId === booking.id}
                              onClick={() =>
                                updateReview(booking.id, "APPROVED")
                              }
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                              Approve
                            </button>

                            <button
                              type="button"
                              disabled={savingId === booking.id}
                              onClick={() =>
                                updateReview(booking.id, "REJECTED")
                              }
                              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-8 text-center text-slate-500"
                    >
                      {search
                        ? "No matching venue bookings found."
                        : "No venue bookings found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
