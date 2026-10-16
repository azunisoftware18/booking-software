"use client";

import React, { useState } from "react";
import { Plus, TicketCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";

import TicketTypeTable from "@/components/table/TicketTypeTable";
import TicketTypeModal from "@/components/modals/TicketTypeModal";
import Button from "@/components/ui/Button";

import { useHandleTicketType } from "@/lib/mutations/useTicketType";
import { useTicketTypes } from "@/lib/queries/useTicketType";
import { usePlaces } from "@/lib/queries/usePlace";
import { useSelector } from "react-redux";
import StatCard from "@/components/common/StatCard";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { useGetMe } from "@/lib/queries/useGetMe";

export default function TicketTypePage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [bookingEntryFeeQuantities, setBookingEntryFeeQuantities] = useState(
    {},
  );
  const [deleteItem, setDeleteItem] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editData, setEditData] = useState(null);
  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    title: "",
    description: "",
    variant: "success",
  });

  const { mutateAsync: handleTicketType } = useHandleTicketType();
  const { data: me } = useGetMe();
  const { data: accessiblePlaces = [] } = usePlaces();
  const currentPlace = useSelector((state) => state.place.currentPlace);
  const isSuperAdmin = me?.role?.roleCode === "SUPER_ADMIN";

  const hasAssignedLocation = Boolean(me?.locationId || me?.location?.id);
  const placeId =
    editData?.placeId ||
    me?.placeId ||
    (hasAssignedLocation
      ? accessiblePlaces[0]?.id
      : currentPlace?.id || currentPlace?._id);
  const { data: ticketTypes, isLoading } = useTicketTypes(
    placeId,
    isSuperAdmin,
  );
  const assignedLocation = me?.location;
  const assignedCenter = assignedLocation?.city || assignedLocation?.name;
  const visibleTicketTypes = !isSuperAdmin && assignedCenter
    ? (ticketTypes || []).filter(
        (ticket) =>
          ticket.center?.trim().toLowerCase() ===
          assignedCenter.trim().toLowerCase(),
      )
    : ticketTypes || [];
  const bookableTicketTypes = visibleTicketTypes.filter(
    (ticket) =>
      ticket.isAvailable !== false && (ticket.place?.id || ticket.placeId),
  );
  const selectedBookingEntryFees = bookableTicketTypes.filter(
    (ticket) => Number(bookingEntryFeeQuantities[ticket.id] || 0) > 0,
  );
  const selectedBookingPlaceId =
    selectedBookingEntryFees[0]?.place?.id ||
    selectedBookingEntryFees[0]?.placeId;
  const selectedBookingCenter = selectedBookingEntryFees[0]?.center;
  const totalBookingQuantity = selectedBookingEntryFees.reduce(
    (total, ticket) => total + Number(bookingEntryFeeQuantities[ticket.id]),
    0,
  );
  const bookingTotal = selectedBookingEntryFees
    .reduce((total, ticket) => {
      const price = Number(ticket.price || 0);
      const taxPercent = Number(ticket.taxPercent || 0);
      const unitPrice = Math.round(price * (1 + taxPercent / 100) * 100) / 100;
      return total + unitPrice * Number(bookingEntryFeeQuantities[ticket.id]);
    }, 0)
    .toFixed(2);

  const openBookingDialog = () => {
    setBookingEntryFeeQuantities({});
    setIsBookingDialogOpen(true);
  };

  const continueEntryFeeBooking = () => {
    if (!selectedBookingEntryFees.length || !selectedBookingPlaceId) return;

    const params = new URLSearchParams();
    selectedBookingEntryFees.forEach((ticket) => {
      params.append("entryFeeId", ticket.id);
      params.append(
        "quantity",
        String(bookingEntryFeeQuantities[ticket.id]),
      );
    });
    setIsBookingDialogOpen(false);
    router.push(`/book-tickets/${selectedBookingPlaceId}?${params.toString()}`);
  };

  const totalTicketTypes = visibleTicketTypes.length;

  const totalPrice =
    visibleTicketTypes.reduce((sum, ticket) => {
      return sum + Number(ticket.price || 0);
    }, 0) || 0;

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      await handleTicketType({
        action: "delete",

        data: {
          id: deleteItem.id,
          placeId: deleteItem.placeId,
        },
      });

      setDeleteItem(null);
      setDialogConfig({
        open: true,
        title: "Deleted Successfully",
        description: "Ticket type has been deleted successfully.",
        variant: "success",
      });
    } catch (err) {
      setDialogConfig({
        open: true,
        title: "Delete Failed",
        description: err?.message || "Something went wrong.",
        variant: "danger",
      });
    }
  };
  // 🔥 SUBMIT
  const handleFormSubmit = async (formData) => {
    try {
      const payload = {
        action: editData ? "update" : "create",

        data: {
          id: editData?.id,

          name: formData.name,

          center: assignedCenter || formData.center,

          price: Number(formData.price),

          taxPercent: Number(formData.taxPercent || 0),

          isAvailable: formData.isAvailable,


          placeId: editData?.placeId || placeId,
        },
      };

      await handleTicketType(payload);

      setDialogConfig({
        open: true,

        title: editData ? "Updated Successfully" : "Created Successfully",

        description: editData
          ? "Ticket type updated successfully."
          : "New ticket type created successfully.",

        variant: "success",
      });

      setIsModalOpen(false);
      setEditData(null);
    } catch (err) {
      console.error(err);

      setDialogConfig({
        open: true,

        title: "Operation Failed",

        description:
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong.",

        variant: "danger",
      });
    }
  };
  // 🔥 EDIT
  const handleEdit = (ticket) => {
    setEditData(ticket);
    setIsModalOpen(true);
  };

  const permissions =
    me?.data?.permissions ??
    me?.permissions ??
    me?.data?.data?.permissions ??
    [];

  const canCreateTicketType =
    !isSuperAdmin &&
    permissions.some(
      (permission) =>
        permission.resource === "TICKET_TYPE" &&
        permission.action === "CREATE" &&
        permission.isActive,
    );

  return (
    <div className=" bg-slate-50 ">
      {/* --- Header Section --- */}
      <div className="w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Entry Fees
          </h1>

          <p className="text-slate-500 font-medium">
            View and manage location entry fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openBookingDialog}
            disabled={!bookableTicketTypes.length || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TicketCheck size={18} />
            Book Entry Fee
          </button>
          {canCreateTicketType && (
            <Button
              icon={Plus}
              iconPosition="left"
              onClick={() => {
                setEditData(null);
                setIsModalOpen(true);
              }}
              text="Create Entry Fee"
            />
          )}
        </div>
      </div>
      {/* ===================== */}
      {/* STAT CARDS */}
      {/* ===================== */}

      <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Entry Fees"
          value={totalTicketTypes}
          percentage={12}
          isUp={true}
          trendingText="Available entry fee categories"
          subText="Total configured entry fees"
        />

        <StatCard
          title="Total Entry Fees"
          value={`₹${totalPrice}`}
          percentage={8}
          isUp={true}
          trendingText="Combined pricing"
          subText="Total ticket pricing value"
        />

        <StatCard
          title="Tax Configured"
          value={`${visibleTicketTypes.filter((ticket) => Number(ticket.taxPercent) > 0).length}/${totalTicketTypes}`}
          percentage={5}
          isUp={true}
          trendingText="Categories with GST / tax"
          subText="Tax settings per entry fee"
        />
      </div>
      {/* --- Table Container --- */}
      <div className="w-full mx-auto">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {/* 🔥 TABLE */}

          <TicketTypeTable
            data={visibleTicketTypes}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={(ticket) => setDeleteItem(ticket)}
          />
        </div>
      </div>

      {/* --- Modal --- */}
      <TicketTypeModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editData}
        currentUser={me}
      />
      {isBookingDialogOpen && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="entry-fee-booking-title"
          onClick={() => setIsBookingDialogOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#994113]">
                  Entry fee booking
                </p>
                <h2
                  id="entry-fee-booking-title"
                  className="mt-2 text-xl font-bold text-slate-900"
                >
                  Select ticket types and quantities
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close booking dialog"
                onClick={() => setIsBookingDialogOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid max-h-[55vh] gap-3 overflow-y-auto pr-1">
              {bookableTicketTypes.map((ticket) => {
                const quantity = Number(
                  bookingEntryFeeQuantities[ticket.id] || 0,
                );
                const ticketPlaceId = ticket.place?.id || ticket.placeId;
                const isDifferentPlace =
                  Boolean(selectedBookingPlaceId) &&
                  (ticketPlaceId !== selectedBookingPlaceId ||
                    ticket.center?.trim().toLowerCase() !==
                      selectedBookingCenter?.trim().toLowerCase());
                const taxPercent = Number(ticket.taxPercent || 0);
                const priceWithTax =
                  Math.round(
                    Number(ticket.price || 0) * (1 + taxPercent / 100) * 100,
                  ) / 100;

                return (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors sm:p-5 ${
                      quantity > 0
                        ? "border-[#994113] bg-amber-50 ring-2 ring-[#994113]/15"
                        : "border-slate-200"
                    } ${isDifferentPlace ? "opacity-50" : ""}`}
                  >
                    <label
                      htmlFor={`booking-entry-fee-${ticket.id}`}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                    >
                      <input
                        id={`booking-entry-fee-${ticket.id}`}
                        type="checkbox"
                        checked={quantity > 0}
                        disabled={isDifferentPlace}
                        onChange={(event) =>
                          setBookingEntryFeeQuantities((current) => ({
                            ...current,
                            [ticket.id]: event.target.checked ? 1 : 0,
                          }))
                        }
                        className="h-5 w-5 shrink-0 accent-[#994113]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-slate-800 sm:text-lg">
                          {ticket.name}
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
                    <label
                      htmlFor={`booking-entry-fee-quantity-${ticket.id}`}
                      className="shrink-0 text-xs font-medium text-slate-600"
                    >
                      Qty
                      <input
                        id={`booking-entry-fee-quantity-${ticket.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={quantity}
                        disabled={isDifferentPlace}
                        onChange={(event) => {
                          const nextQuantity = Number(event.target.value);
                          setBookingEntryFeeQuantities((current) => ({
                            ...current,
                            [ticket.id]:
                              Number.isSafeInteger(nextQuantity) &&
                              nextQuantity > 0
                                ? nextQuantity
                                : 0,
                          }));
                        }}
                        className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-2 text-center text-base font-semibold text-slate-800 outline-none focus:border-[#994113] focus:ring-2 focus:ring-[#994113]/20 disabled:bg-slate-100"
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
                  ({totalBookingQuantity})
                </span>
              </span>
              <span className="text-[#994113]">₹{bookingTotal}</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBookingDialogOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !selectedBookingEntryFees.length || !selectedBookingPlaceId
                }
                onClick={continueEntryFeeBooking}
                className="rounded-xl bg-gradient-to-r from-jaipur-dark to-[#994113] px-5 py-3 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue booking
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationDialog
        open={!!deleteItem}
        title="Delete Entry Fee?"
        description="This action cannot be undone. The selected entry fee will be permanently deleted."
        confirmText="Delete Entry Fee"
        cancelText="Cancel"
        variant="danger"
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />
      <ConfirmationDialog
        open={dialogConfig.open}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="Okay"
        variant={dialogConfig.variant}
        onCancel={() =>
          setDialogConfig((prev) => ({
            ...prev,
            open: false,
          }))
        }
        onConfirm={() =>
          setDialogConfig((prev) => ({
            ...prev,
            open: false,
          }))
        }
        showCancelButton={false}
      />
    </div>
  );
}
