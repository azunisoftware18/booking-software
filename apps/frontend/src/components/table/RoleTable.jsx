// frontend/src/components/table/RoleTable.jsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Edit, Trash2, MapPin, ShieldCheck, MoreVertical } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";

export default function RoleTable({ data, loading, onEdit, onDelete }) {
  // ✅ HOOKS SABSE PEHLE (Conditional returns se pehle)
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-16 text-center">
          <p className="text-sm text-gray-500">Loading roles...</p>
        </div>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (!data || data.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <ShieldCheck size={22} className="text-gray-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-700">
            No roles found
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Try changing your search or add a new role.
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
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Role Code
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Places
              </th>
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Description
              </th>
              <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Users
              </th>
              <th className="px-5 py-4 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((role) => (
              <tr
                key={role.id}
                className="border-b border-gray-100 transition hover:bg-gray-50"
              >
                {/* ROLE */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                      <ShieldCheck size={17} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {role.roleName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        System Role
                      </p>
                    </div>
                  </div>
                </td>

                {/* ROLE CODE */}
                <td className="px-5 py-4">
                  <span className="rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-700">
                    {role.roleCode}
                  </span>
                </td>

                {/* PLACES - Safe Access */}
                <td className="px-5 py-4">
                  {Array.isArray(role.places) && role.places.length > 0 ? (
                    <div className="flex max-w-45 flex-wrap gap-1.5">
                      {role.places.map((place, index) => (
                        <span
                          key={`${place}-${index}`}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
                        >
                          <MapPin size={11} />
                          {place}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">All Places</span>
                  )}
                </td>

                {/* DESCRIPTION */}
                <td className="max-w-70 px-5 py-4">
                  <p className="truncate text-sm text-gray-600">
                    {role.description || "—"}
                  </p>
                </td>

                {/* USERS - Safe Access */}
                <td className="px-5 py-4 text-center">
                  <span className="text-sm font-medium text-gray-700">
                    {role.users ?? 0}
                  </span>
                </td>

                {/* STATUS - Safe Access */}
                <td className="px-5 py-4 text-center">
                  <StatusBadge status={role.status || "Active"} />
                </td>


                {/* ACTIONS - PERMISSION BASED */}
                <td className="px-5 py-4">
                  <div className="relative flex justify-end">
                    {(onEdit || onDelete) && (
                      <>
                        <button
                          onClick={() =>
                            setOpenDropdownId(
                              openDropdownId === role.id ? null : role.id
                            )
                          }
                          className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                          title="Actions"
                          aria-label="Role actions"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {openDropdownId === role.id && (
                          <div
                            ref={dropdownRef}
                            className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                          >
                            {onEdit && (
                              <button
                                onClick={() => {
                                  onEdit(role);
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                              >
                                <Edit size={15} />
                                Edit
                              </button>
                            )}

                            {onDelete && (
                              <button
                                onClick={() => {
                                  onDelete(role);
                                  setOpenDropdownId(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
        <p className="text-xs text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-700">{data.length}</span> roles
        </p>
      </div>
    </div>
  );
}
