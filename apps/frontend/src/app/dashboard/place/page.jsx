"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  PlusIcon,
} from "lucide-react";
import PlaceTable from "@/components/table/PlaceTable";
import AddPlaceModal from "@/components/modals/AddPlaceModal";
import { usePlaces } from "@/lib/queries/usePlace";
import {
  useCreatePlace,
  useDeletePlace,
  useUpdatePlace,
} from "@/lib/mutations/usePlace";
import {
  useCreateSlotTemplate,
  useDeleteSlotTemplate,
  useUpdateSlotTemplate,
} from "@/lib/mutations/useSlot";
import Button from "@/components/ui/Button";
import { useGetMe } from "@/lib/queries/useGetMe";

export default function PlacePage() {
  const { data: places, isLoading } = usePlaces();
  const { data: me } = useGetMe();
  const { mutateAsync: createPlace } = useCreatePlace();
  const { mutateAsync: deletePlace } = useDeletePlace();
  const { mutateAsync: updatePlace } = useUpdatePlace();
  const { mutateAsync: createSlotTemplate } = useCreateSlotTemplate();
  const { mutateAsync: updateSlotTemplate } = useUpdateSlotTemplate();
  const { mutateAsync: deleteSlotTemplate } = useDeleteSlotTemplate();
  const [editData, setEditData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [alert, setAlert] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => setAlert({ ...alert, show: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);


  const handleFormSubmit = async (formData) => {
    try {
      const payload = {
        annexure: formData.annexure,
        annexureOption: formData.annexureOption,
        rate4Hours: formData.rate4Hours,
        rate8Hours: formData.rate8Hours,
        ratePerPerson: formData.ratePerPerson,
        ratePerStudent: formData.ratePerStudent,
        name: formData.name.trim(),
        location: formData.location.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        shortDescription: formData.shortDescription || "",
        description: formData.description || "",
        image: formData.image || null,
        slotTemplates: editData ? [] : formData.slotTemplates || [],
      };

      // Duplicate check
      const isDuplicate = places?.some((p) => {
        const nameMatch = p.name?.toLowerCase() === payload.name.toLowerCase();

        const locationMatch =
          p.location?.toLowerCase() === payload.location.toLowerCase();

        // Edit ke time current place ko ignore karo
        const isNotCurrentItem = p.id !== editData?.id;

        return nameMatch && locationMatch && isNotCurrentItem;
      });

      if (isDuplicate) {
        setAlert({
          show: true,
          message: `Oops! "${payload.name}" already exists in "${payload.location}".`,
          type: "error",
        });

        return;
      }

      // ==============================
      // UPDATE
      // ==============================
      if (editData) {
        await updatePlace({
          id: editData.id,
          payload,
        });

        const originalTemplates = editData.slotTemplates || [];
        const submittedTemplates = formData.slotTemplates || [];
        const submittedIds = new Set(
          submittedTemplates.map((template) => template.id).filter(Boolean),
        );

        if (canUpdateSlots) {
          for (const template of submittedTemplates) {
            if (!template.id) continue;

            const original = originalTemplates.find(
              (item) => item.id === template.id,
            );
            if (
              original &&
              (original.startTime !== template.startTime ||
                original.endTime !== template.endTime ||
                Number(original.capacity) !== Number(template.capacity))
            ) {
              await updateSlotTemplate({
                id: template.id,
                payload: {
                  placeId: editData.id,
                  startTime: template.startTime,
                  endTime: template.endTime,
                  capacity: Number(template.capacity),
                },
              });
            }
          }
        }

        if (canCreateSlots) {
          for (const template of submittedTemplates) {
            if (template.id) continue;

            await createSlotTemplate({
              placeId: editData.id,
              startTime: template.startTime,
              endTime: template.endTime,
              capacity: Number(template.capacity),
            });
          }
        }

        if (canDeleteSlots) {
          for (const template of originalTemplates) {
            if (submittedIds.has(template.id)) continue;

            await deleteSlotTemplate({
              id: template.id,
              placeId: editData.id,
            });
          }
        }
      }

      // ==============================
      // CREATE
      // ==============================
      else {
        await createPlace(payload);
      }

      setEditData(null);
      setIsModalOpen(false);

      setAlert({
        show: true,
        message: editData
          ? "Place updated successfully!"
          : "Place created successfully!",
        type: "success",
      });
    } catch (err) {
      console.error("Place submit error:", err);

      setAlert({
        show: true,
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong",
        type: "error",
      });
      throw err;
    }
  };

  const handleDelete = async (place) => {
    if (!confirm("Delete this place?")) return;

    try {
      await deletePlace(place.id);

      setAlert({
        show: true,
        message: "Place deleted successfully!",
        type: "success",
      });
    } catch {
      setAlert({
        show: true,
        message: "Delete failed!",
        type: "error",
      });
    }
  };

  const handleEdit = (place) => {
    setEditData(place);
    setIsModalOpen(true);
  };


  // Axios response ya React Query ke unwrapped response ko handle karega
  const permissions =
    me?.data?.permissions ??
    me?.permissions ??
    me?.data?.data?.permissions ??
    [];
  const isSuperAdmin = me?.role?.roleCode === "SUPER_ADMIN";
  const assignedLocation = [
    me?.location?.city,
    me?.location?.state,
  ]
    .filter(Boolean)
    .join(", ") || me?.location?.name || "";

  const canCreatePlace = !isSuperAdmin && permissions.some(
    (permission) =>
      permission.resource === "PLACE" &&
      permission.action === "CREATE"
  );
  const canCreateSlots = permissions.some(
    (permission) =>
      permission.resource === "SLOT" &&
      permission.action === "CREATE" &&
      permission.isActive,
  );
  const canUpdateSlots = permissions.some(
    (permission) =>
      permission.resource === "SLOT" &&
      permission.action === "UPDATE" &&
      permission.isActive,
  );
  const canDeleteSlots = permissions.some(
    (permission) =>
      permission.resource === "SLOT" &&
      permission.action === "DELETE" &&
      permission.isActive,
  );


  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen">
      {/* --- INLINE ALERT MESSAGE --- */}
      {alert.show && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-10000 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${alert.type === "success"
            ? "bg-emerald-500 text-white"
            : "bg-red-500 text-white"
            }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-bold text-sm">{alert.message}</span>
        </div>
      )}

      <div className="w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Tourist Destinations
          </h1>
          <p className="text-slate-500 font-medium">Manage your locations</p>
        </div>




        {canCreatePlace && (
          <Button
            icon={PlusIcon}
            iconPosition="left"
            onClick={() => {
              setEditData(null);
              setIsModalOpen(true);
            }}
            text="Add New Place"
          />
        )}

      </div>

      <div className="w-full mx-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <PlaceTable
          data={places}
          loading={isLoading}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </div>

      <AddPlaceModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null); // 🔥 reset
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editData}
        existingPlaces={places}
        canCreateSlots={canCreateSlots}
        canUpdateSlots={canUpdateSlots}
        canDeleteSlots={canDeleteSlots}
        assignedLocation={assignedLocation}
      />
    </div>
  );
}
