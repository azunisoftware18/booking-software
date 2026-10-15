"use client";

import React, { useState } from "react";
import { Info, Plus } from "lucide-react";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const hasAssignedLocation = Boolean(me?.locationId || me?.location?.id);
  const placeId =
    editData?.placeId ||
    me?.placeId ||
    (hasAssignedLocation
      ? accessiblePlaces[0]?.id
      : currentPlace?.id || currentPlace?._id);
  const { data: ticketTypes, isLoading } = useTicketTypes(placeId);
  const assignedLocation = me?.location;
  const assignedCenter = assignedLocation?.city || assignedLocation?.name;
  const visibleTicketTypes = assignedCenter
    ? (ticketTypes || []).filter(
        (ticket) =>
          ticket.center?.trim().toLowerCase() ===
          assignedCenter.trim().toLowerCase(),
      )
    : ticketTypes || [];

  const totalTicketTypes = visibleTicketTypes.length;

  const totalPrice =
    visibleTicketTypes.reduce((sum, ticket) => {
      return sum + Number(ticket.price || 0);
    }, 0) || 0;

  const totalBookingLimit =
    visibleTicketTypes.reduce((sum, ticket) => {
      return sum + Number(ticket.maxPerBooking || 0);
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

          isAvailable: formData.isAvailable,

          maxPerBooking: Number(formData.maxPerBooking),

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

  const isSuperAdmin = me?.role?.roleCode === "SUPER_ADMIN";

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
          title="Configured Categories"
          value={totalBookingLimit}
          percentage={5}
          isUp={false}
          trendingText="Max booking capacity"
          subText="Total configured rate categories"
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
