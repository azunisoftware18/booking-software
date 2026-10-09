"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  ShieldCheck,
  Mail,
  User2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import Button from "../ui/Button";
import { usePermissions } from "@/lib/queries/usePermission";
import { useUserPermissions } from "@/lib/queries/useUserPermission";
import { useAssignPermission } from "@/lib/mutations/useAssignPermission";

export default function AssignPermissionModal({
  open,
  user,
  onClose,
  onSaved,
}) {
  const [selected, setSelected] = useState([]);
  const [initialSelected, setInitialSelected] = useState([]);
  const [openResource, setOpenResource] = useState(null);

  // ✅ All permissions
  const { data: permissionsData = [], isLoading: loadingPermissions } =
    usePermissions();

  // ✅ User's current permissions (fresh fetch)
  const {
    data: userPermissions = [],
    isLoading: loadingUserPermissions,
    isFetching: fetchingUserPermissions,
  } = useUserPermissions(open ? user?.id : undefined);

  // ✅ Save mutation
  const { mutateAsync: assignPermissions, isPending: saving } =
    useAssignPermission();

  // ✅ Sync selected with user's directly-assigned permissions
  useEffect(() => {
    if (!open || !user?.id || loadingUserPermissions) return;

    // Only direct USER assignments are editable in this modal
    const directlyAssigned = userPermissions
      .filter((permission) => permission.sources?.includes("USER"))
      .map((permission) => permission.id);

    const uniqueIds = [...new Set(directlyAssigned)];

    setInitialSelected(uniqueIds);
    setSelected(uniqueIds);
    setOpenResource(null);
  }, [open, user?.id, loadingUserPermissions, userPermissions]);

  // ✅ Group permissions by resource
  const grouped = useMemo(() => {
    return permissionsData.reduce((acc, permission) => {
      const resource = permission.resource || "OTHER";
      if (!acc[resource]) acc[resource] = [];
      acc[resource].push(permission);
      return acc;
    }, {});
  }, [permissionsData]);

  if (!open || !user) return null;

  const isAllowed = (permissionId) => selected.includes(permissionId);

  // ✅ Toggle single permission
  const toggleEffect = (permissionId) => {
    setSelected((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // ✅ Toggle all in a resource
  const toggleAll = (resourcePerms) => {
    const resourceIds = resourcePerms.map((perm) => perm.id);

    setSelected((prev) => {
      const allAssigned =
        resourceIds.length > 0 &&
        resourceIds.every((id) => prev.includes(id));

      if (allAssigned) {
        const idsToRemove = new Set(resourceIds);
        return prev.filter((id) => !idsToRemove.has(id));
      }

      return [...new Set([...prev, ...resourceIds])];
    });
  };

  // ✅ Diff-based save
  const handleSave = async () => {
    if (!user?.id) return;

    const assignPermissionIds = selected.filter(
      (id) => !initialSelected.includes(id)
    );

    const removePermissionIds = initialSelected.filter(
      (id) => !selected.includes(id)
    );

    if (assignPermissionIds.length === 0 && removePermissionIds.length === 0) {
      onClose?.();
      return;
    }

    try {
      await assignPermissions({
        userId: user.id,
        assignPermissionIds,
        removePermissionIds,
      });

      await onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Save permissions error:", error);
    }
  };

  const isLoading = loadingPermissions || loadingUserPermissions;
  const isBusy = isLoading || fetchingUserPermissions;

  const fullName =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "User";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onClose?.();
        }}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Assign Permissions
              </h2>
              <p className="text-xs text-slate-500">
                Manage access rights for this user
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!saving) onClose?.();
            }}
            disabled={saving}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="border-b border-gray-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
              <User2 className="h-5 w-5 text-slate-500" />
            </div>

            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">
                {fullName}
              </div>

              <div className="flex items-center text-xs text-slate-500">
                <Mail className="mr-1 h-3 w-3 shrink-0" />
                <span className="truncate">{user.email || "No email"}</span>
              </div>
            </div>

            <span className="ml-auto rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {user.role?.roleName || user.roleName || "No Role"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              Select Permissions
            </p>
            <p className="text-xs font-medium text-slate-500">
              {selected.length} selected
            </p>
          </div>

          {isBusy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm">Loading permissions...</span>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-500">No permissions available</p>
            </div>
          ) : (
            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(grouped).map(([resource, resourcePerms]) => {
                const allowedCount = resourcePerms.filter((perm) =>
                  isAllowed(perm.id)
                ).length;

                const allAssigned =
                  resourcePerms.length > 0 &&
                  allowedCount === resourcePerms.length;

                const isOpen = openResource === resource;

                return (
                  <div
                    key={resource}
                    className={`relative overflow-visible rounded-xl border bg-white shadow-sm ${
                      isOpen ? "z-20" : "z-0"
                    }`}
                  >
                    {/* Resource Header */}
                    <div
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                      onClick={() =>
                        setOpenResource((prev) =>
                          prev === resource ? null : resource
                        )
                      }
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold tracking-wide text-slate-800">
                          {resource.replaceAll("_", " ")}
                        </p>

                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {allowedCount}/{resourcePerms.length}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {/* Assign All / Remove All */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            text={allAssigned ? "Remove All" : "Assign All"}
                            type="button"
                            size="sm"
                            variant={allAssigned ? "destructive" : "default"}
                            className="min-w-20"
                            onClick={(e) => {
                              e?.stopPropagation?.();
                              toggleAll(resourcePerms);
                            }}
                          />
                        </div>

                        {isOpen ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>

                    {/* Permissions Dropdown */}
                    {isOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-2xl">
                        <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                          {resourcePerms.map((perm) => {
                            const allowed = isAllowed(perm.id);

                            return (
                              <div
                                key={perm.id}
                                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                              >
                                <span className="wrap-break-word text-sm font-medium text-slate-700">
                                  {perm.action ||
                                    perm.name ||
                                    perm.permissionName ||
                                    perm.code ||
                                    perm.id}
                                </span>

                                <Button
                                  text={allowed ? "Remove" : "Allow"}
                                  type="button"
                                  size="sm"
                                  className="min-w-20 shrink-0"
                                  variant={allowed ? "destructive" : "default"}
                                  onClick={(e) => {
                                    e?.stopPropagation?.();
                                    toggleEffect(perm.id);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}