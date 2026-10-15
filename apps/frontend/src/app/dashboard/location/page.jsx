"use client";

import { useState, useMemo } from "react";
import { Plus, UserPlus, Layers, Users } from "lucide-react";
import { useSelector } from "react-redux";
import Button from "@/components/ui/Button";
import SearchField from "@/components/ui/SearchField";
import StatCard from "@/components/common/StatCard";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import LocationTable from "@/components/table/LocationTable";
import AdminTable from "@/components/table/AdminTable";
import LocationModal from "@/components/modals/LocationModal";
import AdminModal from "@/components/modals/AdminModal";
import AssignPermissionModal from "@/components/modals/AssignPermissionModal";
import { useLocations } from "@/lib/queries/useLocation";
import { useHandleLocation } from "@/lib/mutations/useLocation";
import { useGetMe } from "@/lib/queries/useGetMe";
import { useAdmins } from "@/lib/queries/useAdmin"; // ✅ ADD
import {
  useCreateAdmin,
  useDeleteAdmin,
  useUpdateAdmin,
} from "@/lib/mutations/useAdmin";

export default function LocationManagementPage() {
  const user = useSelector((state) => state.auth?.user);
  const isSuperAdmin = user?.role?.roleCode === "SUPER_ADMIN";

  const { data: locations = [], isLoading } = useLocations();
  const { mutateAsync: handleLocation } = useHandleLocation();

  // ✅ REAL ADMINS DATA (dummy state hata di)
  const { data: admins = [], isLoading: adminsLoading } = useAdmins();
  const { mutateAsync: createAdmin, isPending: isCreatingAdmin } =
    useCreateAdmin();
  const { mutateAsync: updateAdmin, isPending: isUpdatingAdmin } =
    useUpdateAdmin();
  const { mutateAsync: deleteAdmin, isPending: isDeletingAdmin } =
    useDeleteAdmin();

  const [activeTab, setActiveTab] = useState("locations");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [adminToEdit, setAdminToEdit] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [adminToView, setAdminToView] = useState(null);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [permissionAdmin, setPermissionAdmin] = useState(null);

  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    title: "",
    description: "",
    variant: "success",
  });

  // ✅ Filter Locations
  const filteredLocations = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return locations;
    return locations.filter(
      (location) =>
        location.name?.toLowerCase().includes(value) ||
        location.city?.toLowerCase().includes(value) ||
        location.address?.toLowerCase().includes(value) ||
        location.state?.toLowerCase().includes(value),
    );
  }, [locations, search]);

  // ✅ Filter Admins
  const filteredAdmins = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return admins;
    return admins.filter(
      (admin) =>
        admin.name?.toLowerCase().includes(value) ||
        admin.email?.toLowerCase().includes(value) ||
        admin.location?.toLowerCase().includes(value),
    );
  }, [admins, search]);

  const activeLocations = locations.filter(
    (location) => location.status === "ACTIVE",
  ).length;
  const locationsWithAddress = locations.filter((location) => location.address);

  // ✅ CREATE / UPDATE LOCATION
  const handleFormSubmit = async (data) => {
    try {
      const payload = {
        action: editData ? "update" : "create",
        data: {
          ...(editData?.id && { id: editData.id }),
          ...data,
        },
      };

      await handleLocation(payload);

      setDialogConfig({
        open: true,
        title: editData ? "Updated Successfully" : "Created Successfully",
        description: editData
          ? "Location updated successfully."
          : "New location created successfully.",
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

  const handleEdit = (location) => {
    setEditData(location);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await handleLocation({
        action: "delete",
        data: { id: deleteItem.id },
      });
      setDeleteItem(null);
      setDialogConfig({
        open: true,
        title: "Deleted Successfully",
        description: "Location deleted successfully.",
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

  // ✅ CREATE ADMIN (REAL API CALL)
  const handleCreateAdmin = async (adminData) => {
    try {
      if (adminToEdit) {
        await updateAdmin({ id: adminToEdit.id, ...adminData });
      } else {
        await createAdmin(adminData);
      }
      setDialogConfig({
        open: true,
        title: adminToEdit ? "Admin Updated" : "Admin Created",
        description: adminToEdit
          ? `${adminData.name} details have been updated.`
          : `${adminData.name} has been added as an admin.`,
        variant: "success",
      });
      setIsAdminModalOpen(false);
      setAdminToEdit(null);
      setActiveTab("admins");
    } catch (err) {
      console.error(err);
      setDialogConfig({
        open: true,
        title: adminToEdit ? "Update Failed" : "Create Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          `Could not ${adminToEdit ? "update" : "create"} admin.`,
        variant: "danger",
      });
    }
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;

    try {
      await deleteAdmin(adminToDelete.id);
      setAdminToDelete(null);
      setDialogConfig({
        open: true,
        title: "Admin Deleted",
        description: `${adminToDelete.name} has been deleted.`,
        variant: "success",
      });
    } catch (err) {
      console.error(err);
      setAdminToDelete(null);
      setDialogConfig({
        open: true,
        title: "Delete Failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not delete admin.",
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

  const canUpdateLocation = permissions.some(
    (permission) =>
      permission.resource === "LOCATION" &&
      permission.action === "UPDATE" &&
      permission.isActive,
  );

  const canDeleteLocation = permissions.some(
    (permission) =>
      permission.resource === "LOCATION" &&
      permission.action === "DELETE" &&
      permission.isActive,
  );
  const canAssignPermission =
    isSuperAdmin ||
    permissions.some(
      (permission) =>
        permission.resource === "PERMISSION" &&
        permission.action === "ASSIGN" &&
        permission.isActive,
    );

  const handleAssignPermission = (admin) => {
    setPermissionAdmin(admin);
    setIsPermissionOpen(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-7">
      {/* ============ HEADER ============ */}
      <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Location Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {isSuperAdmin
              ? "Manage all system locations and their details."
              : "View the location assigned to your admin account."}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            {activeTab === "locations" ? (
              <Button
                text="Add New Location"
                icon={Plus}
                iconPosition="left"
                onClick={() => {
                  setEditData(null);
                  setIsModalOpen(true);
                }}
                className="px-6 py-3.5 rounded-2xl"
              />
            ) : (
              <Button
                text="Add Admin"
                icon={UserPlus}
                iconPosition="left"
                onClick={() => setIsAdminModalOpen(true)}
              
              />
            )}
          </div>
        )}
      </div>

      {/* STAT CARDS */}
      {activeTab === "locations" && (
        <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Locations"
            value={locations.length}
            percentage={10}
            isUp={true}
            trendingText="All locations"
            subText="Total locations created"
          />
          <StatCard
            title="Active Locations"
            value={activeLocations}
            percentage={8}
            isUp={true}
            trendingText="Currently active"
            subText="Locations in use"
          />
          <StatCard
            title="Locations with Address"
            value={locationsWithAddress.length}
            percentage={5}
            isUp={true}
            trendingText="Address provided"
            subText="Locations with an address"
          />
        </div>
      )}

      {/* TABS UI */}
      <div className="w-fit mx-auto flex items-center gap-2 p-1.5 bg-slate-100 rounded-full mb-6">
        <button
          onClick={() => {
            setActiveTab("locations");
            setSearch("");
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === "locations"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers size={16} />
          Locations
        </button>
        {isSuperAdmin && <button
          onClick={() => {
            setActiveTab("admins");
            setSearch("");
          }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === "admins"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={16} />
          Admins
        </button>}
      </div>

      {/* CONTENT */}
      <div className="w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeTab === "locations" ? "Locations" : "All Admins"}
            </h2>
            <p className="text-xs text-gray-500">
              {activeTab === "locations"
                ? "View and manage all available locations."
                : "View and manage all system admins and their assigned locations."}
            </p>
          </div>
          <div className="w-full md:w-75">
            
          </div>
        </div>

        {activeTab === "locations" ? (
          <LocationTable
            data={filteredLocations}
            loading={isLoading}
            onEdit={canUpdateLocation ? handleEdit : undefined}
            onDelete={
              canDeleteLocation
                ? (location) => setDeleteItem(location)
                : undefined
            }
          />
        ) : (
          <AdminTable
            data={filteredAdmins}
            loading={adminsLoading} // ✅ Real loading state
            onView={setAdminToView}
            onEdit={(admin) => {
              setAdminToEdit(admin);
              setIsAdminModalOpen(true);
            }}
            onDelete={setAdminToDelete}
            canAssignPermission={canAssignPermission}
            onAssignPermission={handleAssignPermission}
          />
        )}
      </div>

      {/* MODALS */}
      <LocationModal
        open={isModalOpen && isSuperAdmin}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={editData}
      />

      <AdminModal
        key={`${isAdminModalOpen}-${adminToEdit?.id || "new"}`}
        open={isAdminModalOpen && isSuperAdmin}
        admin={adminToEdit}
        isSubmitting={isCreatingAdmin || isUpdatingAdmin}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminToEdit(null);
        }}
        onSubmit={handleCreateAdmin}
        locations={locations.filter((location) => location.status === "ACTIVE")}
      />

      <AssignPermissionModal
        open={isPermissionOpen}
        user={permissionAdmin}
        onClose={() => {
          setIsPermissionOpen(false);
          setPermissionAdmin(null);
        }}
        onSaved={() => {
          setDialogConfig({
            open: true,
            title: "Permissions Updated",
            description: `Permissions assigned to ${permissionAdmin?.name} successfully.`,
            variant: "success",
          });
        }}
      />

      <ConfirmationDialog
        open={!!adminToDelete}
        title="Delete Admin?"
        description={`This will permanently delete ${adminToDelete?.name || "this admin"} and revoke their access.`}
        confirmText={isDeletingAdmin ? "Deleting..." : "Delete Admin"}
        cancelText="Cancel"
        variant="danger"
        loading={isDeletingAdmin}
        onCancel={() => setAdminToDelete(null)}
        onConfirm={handleDeleteAdmin}
      />

      {adminToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-details-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  id="admin-details-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Admin Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Account and assigned location
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminToView(null)}
                className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close admin details"
              >
                Close
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Name</dt>
                <dd className="text-slate-900">{adminToView.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="text-slate-900">{adminToView.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Location</dt>
                <dd className="text-slate-900">{adminToView.location || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Status</dt>
                <dd className="text-slate-900">{adminToView.status || "ACTIVE"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Created</dt>
                <dd className="text-slate-900">
                  {adminToView.createdAt
                    ? new Date(adminToView.createdAt).toLocaleDateString("en-IN")
                    : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end">
              <Button
                text="Close"
                variant="outline"
                onClick={() => setAdminToView(null)}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteItem}
        title="Delete Location?"
        description="This action cannot be undone. The selected location will be permanently deleted."
        confirmText="Delete Location"
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
