"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AnnexureRefundModal({ booking, onClose }) {
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState(null);
  const [charges, setCharges] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [refundResult, setRefundResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    api
      .get(`/booking/${booking.id}/refund-quote`)
      .then(({ data }) => {
        if (!isActive) return;
        const refundQuote = data?.data;
        setQuote(refundQuote);
        setCharges(
          Object.fromEntries(
            refundQuote.groups.map((group) => [
              group.placeId,
              { electricityCharge: "0", damageDeduction: "0" },
            ]),
          ),
        );
      })
      .catch((requestError) => {
        if (isActive) {
          setError(
            requestError?.response?.data?.message ||
              "Unable to calculate the refund.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [booking.id]);

  const refundAmount = useMemo(
    () =>
      (quote?.groups || []).reduce((total, group) => {
        const values = charges[group.placeId] || {};
        const electricityCharge = Number(values.electricityCharge || 0);
        const damageDeduction = Number(values.damageDeduction || 0);
        const electricityRefund = Math.max(
          0,
          group.electricityHeld - electricityCharge,
        );
        const electricityOverage = Math.max(
          0,
          electricityCharge - group.electricityHeld,
        );
        return (
          total +
          electricityRefund +
          Math.max(
            0,
            group.securityDepositHeld -
              damageDeduction -
              electricityOverage,
          )
        );
      }, 0),
    [charges, quote],
  );

  const updateCharge = (placeId, key, value) => {
    setCharges((current) => ({
      ...current,
      [placeId]: { ...current[placeId], [key]: value },
    }));
  };

  const downloadReceipt = async () => {
    setIsDownloading(true);
    setError("");
    try {
      const response = await api.get(
        `/booking/${booking.id}/refund-receipt`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `refund-receipt-${booking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "The refund is saved, but the receipt could not be downloaded. Try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const submitRefund = async (event) => {
    event.preventDefault();
    if (!confirmed || !quote || refundResult) return;

    setIsSubmitting(true);
    setError("");
    try {
      const response = await api.post(`/booking/${booking.id}/refund`, {
        externallyRefunded: true,
        items: quote.groups.map((group) => ({
          placeId: group.placeId,
          electricityCharge: Number(
            charges[group.placeId]?.electricityCharge || 0,
          ),
          damageDeduction: Number(
            charges[group.placeId]?.damageDeduction || 0,
          ),
        })),
      });
      setRefundResult(response.data?.data);
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to record the refund.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="annexure-refund-title"
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2
              id="annexure-refund-title"
              className="text-xl font-bold text-slate-900"
            >
              Annexure refund calculation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {booking.name} · Booking {booking.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close refund dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submitRefund} className="space-y-5 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-600">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Calculating refund...
            </div>
          ) : quote ? (
            <>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                Original booking amount:{" "}
                <strong>{formatCurrency(quote.totalAmount)}</strong>
              </div>

              <div className="space-y-4">
                {quote.groups.map((group) => {
                  const values = charges[group.placeId] || {};
                  const electricityCharge = Number(
                    values.electricityCharge || 0,
                  );
                  const damageDeduction = Number(values.damageDeduction || 0);
                  const electricityRefund = Math.max(
                    0,
                    group.electricityHeld - electricityCharge,
                  );
                  const electricityOverage = Math.max(
                    0,
                    electricityCharge - group.electricityHeld,
                  );
                  const securityRefund = Math.max(
                    0,
                    group.securityDepositHeld -
                      damageDeduction -
                      electricityOverage,
                  );

                  return (
                    <section
                      key={group.placeId}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col justify-between gap-1 sm:flex-row">
                        <h3 className="font-semibold text-slate-900">
                          {group.annexure} - {group.annexureOption}:{" "}
                          {group.placeName}
                        </h3>
                        <span className="text-sm text-slate-500">
                          {group.days} {group.days === 1 ? "day" : "days"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Venue charges ({formatCurrency(group.venueCharges)}) are
                        not included in the refundable security/electricity
                        amount.
                      </p>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium uppercase text-slate-500">
                            Electricity
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            Collected: {formatCurrency(group.electricityHeld)}
                          </p>
                          <label className="mt-3 block text-sm font-medium text-slate-700">
                            Actual electricity charge
                            <input
                              type="number"
                              min="0"
                              max={
                                group.electricityHeld +
                                group.securityDepositHeld -
                                damageDeduction
                              }
                              step="0.01"
                              required
                              disabled={
                                group.electricityHeld +
                                  group.securityDepositHeld ===
                                0
                              }
                              value={values.electricityCharge ?? "0"}
                              onChange={(event) =>
                                updateCharge(
                                  group.placeId,
                                  "electricityCharge",
                                  event.target.value,
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                          </label>
                          <p className="mt-2 text-sm font-semibold text-emerald-700">
                            Electricity refund:{" "}
                            {formatCurrency(electricityRefund)}
                          </p>
                          {group.securityDepositHeld > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              Charges above the collected electricity amount
                              can be deducted from the security deposit.
                            </p>
                          )}
                          {electricityOverage > 0 && (
                            <p className="mt-1 text-xs text-amber-700">
                              {formatCurrency(electricityOverage)} above the
                              collected electricity amount will be deducted
                              from the security deposit.
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-medium uppercase text-slate-500">
                            Security deposit
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            Held: {formatCurrency(group.securityDepositHeld)}
                          </p>
                          <label className="mt-3 block text-sm font-medium text-slate-700">
                            Damage deduction
                            <input
                              type="number"
                              min="0"
                              max={group.securityDepositHeld}
                              step="0.01"
                              required
                              value={values.damageDeduction ?? "0"}
                              onChange={(event) =>
                                updateCharge(
                                  group.placeId,
                                  "damageDeduction",
                                  event.target.value,
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                          </label>
                          <p className="mt-2 text-sm font-semibold text-emerald-700">
                            Security deposit refund:{" "}
                            {formatCurrency(securityRefund)}
                          </p>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-900">
                <span>Total refund</span>
                <span className="text-lg">{formatCurrency(refundAmount)}</span>
              </div>

              {refundResult ? (
                <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-900">
                    Refund recorded. Receipt email{" "}
                    {refundResult.receiptEmailSent ? "sent" : "could not be sent"}{" "}
                    to the customer.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={downloadReceipt}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download refund receipt
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-amber-700"
                    />
                    <span>
                      I have processed this refund of{" "}
                      <strong>{formatCurrency(refundAmount)}</strong> outside
                      this app. I understand this action records the refund and
                      cannot be undone.
                    </span>
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!confirmed || isSubmitting || !quote.groups.length}
                      className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Recording refund..." : "Record refund"}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
