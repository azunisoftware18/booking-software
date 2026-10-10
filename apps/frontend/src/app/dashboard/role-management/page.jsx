"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import Button from "@/components/ui/Button";
import SearchField from "@/components/ui/SearchField";
import StatCard from "@/components/common/StatCard";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import RoleTable from "@/components/table/RoleTable";
import RoleModal from "@/components/modals/RoleModal";
import { useRoles } from "@/lib/queries/useRole";
import { useHandleRole } from "@/lib/mutations/useRole";
import { useGetMe } from "@/lib/queries/useGetMe";

export default function RoleManagementPage() {
  // Redux
  const currentPlace = useSelector((state) => state.place?.currentPlace);
  const placeId = currentPlace?.id;

  // React Query
  const { data: roles = [], isLoading } = useRoles(placeId);
  const { mutateAsync: handleRole } = useHandleRole();

  // Local State
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    title: "",
    description: "",
    variant: "success",
  });

  // Filter Logic
  const filteredRoles = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return roles;
    return roles.filter(
      (role) =>
        role.roleName?.toLowerCase().includes(value) ||
        role.roleCode?.toLowerCase().includes(value) ||
        role.description?.toLowerCase().includes(value) ||
        (Array.isArray(role.places) &&
          role.places.some((place) => place.toLowerCase().includes(value)))
    );
  }, [roles, search]);

  // Stats
  const activeRoles = roles.filter((role) => role.status === "Active").length;
  const assignedUsers = roles.reduce(
    (sum, role) => sum + (role.users || 0),
    0
  );

  // Handle Submit (Create / Update)
  const handleFormSubmit = async (data) => {
    try {
      const payload = {
        action: editData ? "update" : "create",
        data: {
          ...(editData?.id && { id: editData.id }),
          roleName: data.roleName,
          roleCode: data.roleCode,
          places: data.places,
          description: data.description,
        },
      };

      await handleRole(payload);

      setDialogConfig({
        open: true,
        title: editData ? "Updated Successfully" : "Created Successfully",
        description: editData
          ? "Role updated successfully."
          : "New role created successfully.",
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

  // Handle Edit
  const handleEdit = (role) => {
    setEditData(role);
    setIsModalOpen(true);
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await handleRole({
        action: "delete",
        data: { id: deleteItem.id },
      });
      setDeleteItem(null);
      setDialogConfig({
        open: true,
        title: "Deleted Successfully",
        description: "Role deleted successfully.",
        variant: "success",
      });
    } catch (err) {
      console.error(err);
      setDialogConfig({
        open: true,
        title: "Delete Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Something went wrong.",
        variant: "danger",
      });
    }
  };

  const { data: me } = useGetMe();

  const permissions =
    me?.data?.permissions ??
    me?.permissions ??
    me?.data?.data?.permissions ??
    [];

  const canCreateRole = permissions.some(
    (permission) =>
      permission.resource === "ROLE" &&
      permission.action === "CREATE" &&
      permission.isActive
  );

  return (
    <div className="bg-slate-50 min-h-screen p-7">
      {/* Header */}
      <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Role Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage system roles and their access locations.
          </p>
        </div>
        {canCreateRole && (
          <Button
            text="Add New Role"
            icon={Plus}
            iconPosition="left"
            onClick={() => {
              setEditData(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-3.5 rounded-2xl"
          />
        )}
      </div>

      {/* STAT CARDS */}
      <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Roles"
          value={roles.length}
          percentage={12}
          isUp={true}
          trendingText="All roles"
          subText="Total roles created"
        />
        <StatCard
          title="Active Roles"
          value={activeRoles}
          percentage={8}
          isUp={true}
          trendingText="Currently active"
          subText="Roles in use"
        />
        <StatCard
          title="Assigned Users"
          value={assignedUsers}
          percentage={5}
          isUp={true}
          trendingText="Users assigned"
          subText="Total user assignments"
        />
      </div>

      {/* Toolbar + Table */}
      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Roles</h2>
            <p className="text-xs text-gray-500">
              View and manage all available roles.
            </p>
          </div>
          <div className="w-full md:w-75">
            <SearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search role..."
            />
          </div>
        </div>

        <RoleTable
          data={filteredRoles}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={(role) => setDeleteItem(role)}
        />
      </div>

      {/* Modals & Dialogs */}
      <RoleModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editData}
      />

      <ConfirmationDialog
        open={!!deleteItem}
        title="Delete Role?"
        description="This action cannot be undone. The selected role will be permanently deleted."
        confirmText="Delete Role"
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
        onCancel={() => setDialogConfig((prev) => ({ ...prev, open: false }))}
        onConfirm={() => setDialogConfig((prev) => ({ ...prev, open: false }))}
        showCancelButton={false}
      />
    </div>
  );
}