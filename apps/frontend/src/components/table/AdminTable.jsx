"use client";

import {
  TableShell,
  TableHead,
  TableBody,
  TableRow,
  TableEmpty,
  TableLoader,
} from "./core";

import ActionMenu from "../common/ActionMenu";
import StatusBadge from "../common/StatusBadge";

import { useState, useMemo } from "react";
import { Eye, Pencil, Trash2, MapPin, UserPlus } from "lucide-react";

export default function AdminTable({
  data = [],
  allData = [],
  isLoading = false,
  loading = false,
  onView,
  onEdit,
  onDelete,
  paginationProps,
}) {
  // =========================================================
  // SEARCH STATE
  // =========================================================

  const [search, setSearch] = useState("");

  // =========================================================
  // LOADING (Support both isLoading & loading)
  // =========================================================

  const tableLoading = isLoading || loading;

  // =========================================================
  // USE allData if provided, else data
  // =========================================================

  const sourceData = useMemo(() => {
    return Array.isArray(allData) && allData.length > 0 ? allData : data;
  }, [allData, data]);

  // =========================================================
  // FILTER DATA BY SEARCH
  // =========================================================

  const filteredData = useMemo(() => {
    if (!Array.isArray(sourceData)) return [];

    const term = search.toLowerCase().trim();
    if (!term) return sourceData;

    return sourceData.filter(
      (admin) =>
        admin.name?.toLowerCase().includes(term) ||
        admin.email?.toLowerCase().includes(term) ||
        admin.location?.toLowerCase().includes(term) ||
        admin.createdBy?.fullName?.toLowerCase().includes(term) ||
        admin.status?.toLowerCase().includes(term),
    );
  }, [sourceData, search]);

  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns = [
    "Admin Name",
    "Email",
    "Assigned Location",
    "Status",
    "Created",
    "Created By",
    "Action",
  ];

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="w-full">
        <TableShell
          title="Admins"
          subtitle={`${filteredData.length} total admins${
            search ? " (filtered)" : ""
          }`}
          searchProps={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            onClear: () => setSearch(""),
            placeholder: "Search admin by name, email or location...",
          }}
          paginationProps={paginationProps}
        >
          <TableHead columns={columns} />

          <TableBody>
            {tableLoading ? (
              <TableLoader rows={5} />
            ) : filteredData.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={
                  search
                    ? "No admins match your search"
                    : "No admins found"
                }
              />
            ) : (
              filteredData.map((admin) => (
                <TableRow
                  key={admin.id}
                  renderActions={() => (
                    <ActionMenu
                      items={[
                        {
                          label: "View Details",
                          icon: Eye,
                          onClick: () => onView?.(admin),
                        },
                        {
                          label: "Edit Admin",
                          icon: Pencil,
                          onClick: () => onEdit?.(admin),
                        },
                        {
                          label: "Delete Admin",
                          icon: Trash2,
                          danger: true,
                          onClick: () => onDelete?.(admin),
                        },
                      ]}
                    />
                  )}
                >
                  {/* Admin Name */}
                  <td className="px-4 py-3 whitespace-nowrap md:px-6 md:py-4">
                    <div className="flex items-center gap-3">
                      {/* <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold">
                        {admin.name?.charAt(0)?.toUpperCase() || "A"}
                      </div> */}
                      <div className="flex flex-col">
                        <p className="font-semibold text-slate-900">
                          {admin.name || "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                    <span className="break-all inline-block max-w-45">
                      {admin.email || "N/A"}
                    </span>
                  </td>

                  {/* Assigned Location */}
                  <td className="px-4 py-3 text-slate-700 md:px-6 md:py-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin size={14} className="text-slate-400" />
                      {admin.location || "—"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <StatusBadge status={admin.status || "ACTIVE"} />
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-slate-500 text-sm md:px-6 md:py-4 whitespace-nowrap">
                    {admin.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "N/A"}
                  </td>

                  <td className="px-4 py-3 text-slate-600 text-sm md:px-6 md:py-4">
                    {admin.createdBy?.fullName || "Unknown"}
                  </td>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableShell>
      </div>
    </div>
  );
}