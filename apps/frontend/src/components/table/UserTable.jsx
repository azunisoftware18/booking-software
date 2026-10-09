// frontend/src/components/table/UserTable.jsx
"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash, User, Mail, ShieldCheck, User2 } from "lucide-react";
import ActionMenu from "../common/ActionMenu";

export default function UserTable({ data, loading, onEdit, onDelete, onAssignPermission }) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return data || [];
    return (data || []).filter((user) =>
      [user?.fullName, user?.email, user?.role?.roleName]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(value))
    );
  }, [data, search]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-16 text-center">
          <p className="text-sm text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <User size={22} className="text-gray-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-700">
            No users found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-225">
          <thead>
            <tr className="border-b border-gray-200 bg-[#fafbfc]">
              <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                User Details
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-6 py-4 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-100 transition hover:bg-gray-50"
              >
                {/* User Details */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center mt-0.5">
                        <Mail className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate max-w-55">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Role - FIXED */}
                <td className="px-6 py-4">
                  <div className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                    <ShieldCheck className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="font-medium">
                      {user.role?.roleName || "No Role"}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        user.status === "Active"
                          ? "bg-green-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {user.status || "Active"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <ActionMenu
                    items={[
                      {
                        label: "Edit User",
                        icon: Pencil,
                        onClick: () => onEdit(user),
                      },

                      {
                        label: "Assign permission",
                        icon: User2,
                        onClick: () => onAssignPermission?.(user),
                      },
                      
                      {
                        label: "Delete",
                        icon: Trash,
                        danger: true,
                        onClick: () => onDelete(user),
                      },

                      
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}