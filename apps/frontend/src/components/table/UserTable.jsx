"use client";

import {
  TableShell,
  TableHead,
  TableBody,
  TableRow,
  TableEmpty,
  TableLoader,
} from "@/components/table/core";

import ActionMenu from "../common/ActionMenu";
import { Pencil, Trash, Mail, ShieldCheck, User2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useGetMe } from "@/lib/queries/useGetMe";

export default function UserTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  onAssignPermission,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10; // ✅ Ek page par kitne items dikhane hain

  const { data: me } = useGetMe();

  const permissions =
    me?.data?.permissions ??
    me?.permissions ??
    me?.data?.data?.permissions ??
    [];

  const hasPermission = (resource, action) =>
    permissions.some(
      (permission) =>
        permission.resource === resource &&
        permission.action === action &&
        permission.isActive,
    );

  const canUpdateUser = hasPermission("USER", "UPDATE");
  const canDeleteUser = hasPermission("USER", "DELETE");
  const canAssignPermission = hasPermission("USER", "ASSIGN_PERMISSIONS");

  // ✅ Search filter
  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return data || [];
    return (data || []).filter((user) =>
      [user?.fullName, user?.email, user?.role?.roleName]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(value)),
    );
  }, [data, search]);

  // ✅ Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  const currentData = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, page]);

  // Search badalne par page 1 par reset karein
  useEffect(() => {
    setPage(1);
  }, [search]);

  const columns = ["User Details", "Role", "Status", "Actions"];

  return (
    <div className="p-6">
      <TableShell
        title="Users"
        subtitle={`${filteredUsers.length} total users found`}
        searchProps={{
          value: search,
          onChange: (e) => setSearch(e.target.value),
          onClear: () => setSearch(""),
          placeholder: "Search users...",
        }}
        paginationProps={{
          page,
          totalPages: totalPages,
          onNext: () => setPage((p) => Math.min(p + 1, totalPages)),
          onPrev: () => setPage((p) => Math.max(p - 1, 1)),
        }}
      >
        <TableHead columns={columns} />

        <TableBody>
          {loading ? (
            <TableLoader rows={5} />
          ) : currentData.length === 0 ? (
            <TableEmpty colSpan={4} message="No users found" />
          ) : (
            currentData.map((user) => (
              <TableRow
                key={user.id}
                renderActions={() =>
                  canUpdateUser || canDeleteUser || canAssignPermission ? (
                    <ActionMenu
                      items={[
                        ...(canUpdateUser
                          ? [
                              {
                                label: "Edit User",
                                icon: Pencil,
                                onClick: () => onEdit?.(user),
                              },
                            ]
                          : []),

                        ...(canAssignPermission
                          ? [
                              {
                                label: "Assign Permission",
                                icon: User2,
                                onClick: () => onAssignPermission?.(user),
                              },
                            ]
                          : []),

                        ...(canDeleteUser
                          ? [
                              {
                                label: "Delete",
                                icon: Trash,
                                danger: true,
                                onClick: () => onDelete?.(user),
                              },
                            ]
                          : []),
                      ]}
                    />
                  ) : null
                }
              >
                {/* User Details */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                   
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {user.fullName || "—"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center mt-0.5">
                        <Mail className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate max-w-55">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <div className="inline-flex items-center rounded-lg bg-blue-50 px-1 py-1.5 text-sm text-blue-700">
                    {/* <ShieldCheck className="w-4 h-4 mr-2 text-blue-500" /> */}
                    
                      {user.role?.roleName || "No Role"}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === "Active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        user.status === "Active"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {user.status || "Active"}
                  </span>
                </td>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>
    </div>
  );
}
