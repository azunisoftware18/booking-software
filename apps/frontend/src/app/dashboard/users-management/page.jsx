"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import Button from "@/components/ui/Button";
import StatCard from "@/components/common/StatCard";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import UserTable from "@/components/table/UserTable";
import UserModal from "@/components/modals/UserModal";
import AssignPermissionModal from "@/components/modals/AssignPermissionModal";

import { useUsers } from "@/lib/queries/useUser";
import { useHandleUser } from "@/lib/mutations/useUser";

export default function UserManagementPage() {
  const { data: users = [], isLoading } = useUsers();
  const { mutateAsync: handleUser } = useHandleUser();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  // ✅ Permission modal state
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState(null);

  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    title: "",
    description: "",
    variant: "success",
  });

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return users;

    return users.filter((user) => {
      return (
        user.fullName?.toLowerCase().includes(value) ||
        user.email?.toLowerCase().includes(value) ||
        user.role?.roleName?.toLowerCase().includes(value) ||
        user.place?.name?.toLowerCase().includes(value)
      );
    });
  }, [users, search]);

  const activeUsers = users.filter((user) => user.status === "Active").length;
  const assignedUsers = users.filter((user) => user.placeId).length;

  // ---------------- User CRUD ----------------
  const handleFormSubmit = async (data) => {
    try {
      const payload = {
        action: editData ? "update" : "create",
        data: {
          ...(editData?.id && { id: editData.id }),
          fullName: data.fullName,
          email: data.email,
          roleId: data.roleId,
          placeId: data.placeId,
          status: data.status,
          ...(data.password && { password: data.password }),
        },
      };

      await handleUser(payload);

      setDialogConfig({
        open: true,
        title: editData ? "Updated Successfully" : "Created Successfully",
        description: editData
          ? "User updated successfully."
          : "New user created successfully.",
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

  const handleEdit = (user) => {
    setEditData(user);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await handleUser({
        action: "delete",
        data: { id: deleteItem.id },
      });
      setDeleteItem(null);
      setDialogConfig({
        open: true,
        title: "Deleted Successfully",
        description: "User deleted successfully.",
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

  const handleAddUser = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  // ---------------- Permissions ----------------
  const handleAssignPermission = (user) => {
    setPermissionUser(user);
    setIsPermissionOpen(true);
  };

  // ✅ Called by modal AFTER successful save (mutation already ran inside modal)
  const handlePermissionsSaved = () => {
    setDialogConfig({
      open: true,
      title: "Permissions Updated",
      description: `Permissions assigned to ${permissionUser?.fullName} successfully.`,
      variant: "success",
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen p-7">
      {/* Header */}
      <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            User Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage users, login credentials, roles and access locations.
          </p>
        </div>

        <Button
          text="Add New User"
          icon={Plus}
          iconPosition="left"
          onClick={handleAddUser}
          className="px-6 py-3.5 rounded-2xl"
        />
      </div>

      {/* Stat Cards */}
      <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={users.length}
          percentage={12}
          isUp={true}
          trendingText="All users"
          subText="Total users created"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          percentage={8}
          isUp={true}
          trendingText="Currently active"
          subText="Users who can login"
        />
        <StatCard
          title="Assigned Users"
          value={assignedUsers}
          percentage={5}
          isUp={true}
          trendingText="Access assigned"
          subText="Users with place access"
        />
      </div>

      {/* Table */}
      <div className="w-full mx-auto">
        <UserTable
          data={filteredUsers}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={(user) => setDeleteItem(user)}
          onAssignPermission={handleAssignPermission}
        />
      </div>

      {/* User Modal */}
      <UserModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editData}
      />

      {/* ✅ Assign Permission Modal — modal handles API internally */}
      <AssignPermissionModal
        open={isPermissionOpen}
        user={permissionUser}
        onClose={() => {
          setIsPermissionOpen(false);
          setPermissionUser(null);
        }}
        onSaved={handlePermissionsSaved}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteItem}
        title="Delete User?"
        description="This action cannot be undone. The selected user will be permanently deleted."
        confirmText="Delete User"
        cancelText="Cancel"
        variant="danger"
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />

      {/* Success/Error Dialog */}
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