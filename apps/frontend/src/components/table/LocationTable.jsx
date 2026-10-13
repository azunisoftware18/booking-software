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
import { Eye, Pencil, Trash2 } from "lucide-react";

export default function LocationTable({
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
      (location) =>
        location.name?.toLowerCase().includes(term) ||
        location.city?.toLowerCase().includes(term) ||
        location.state?.toLowerCase().includes(term) ||
        location.address?.toLowerCase().includes(term) ||
        location.status?.toLowerCase().includes(term),
    );
  }, [sourceData, search]);

  // =========================================================
  // DYNAMIC COLUMNS (Agar onEdit/onDelete dono nahi hain to Action column hide)
  // =========================================================

  const showActions = Boolean(onView || onEdit || onDelete);

  const columns = useMemo(() => {
    const base = ["Location Name", "City", "State", "Status"];
    return showActions ? [...base, "Action"] : base;
  }, [showActions]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="w-full">
        <TableShell
          title="Locations"
          subtitle={`${filteredData.length} total locations${
            search ? " (filtered)" : ""
          }`}
          searchProps={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            onClear: () => setSearch(""),
            placeholder: "Search location by name, city or state...",
          }}
          paginationProps={paginationProps}
        >
          <TableHead columns={columns} />

          <TableBody>
            {tableLoading ? (
              <TableLoader rows={5} />
            ) : filteredData.length === 0 ? (
              <TableEmpty
                colSpan={columns.length}
                message={
                  search
                    ? "No locations match your search"
                    : "No locations found"
                }
              />
            ) : (
              filteredData.map((location) => (
                <TableRow
                  key={location.id}
                  renderActions={
                    showActions
                      ? () => (
                          <ActionMenu
                            items={[
                              ...(onView
                                ? [
                                    {
                                      label: "View Details",
                                      icon: Eye,
                                      onClick: () => onView(location),
                                    },
                                  ]
                                : []),
                              ...(onEdit
                                ? [
                                    {
                                      label: "Edit Location",
                                      icon: Pencil,
                                      onClick: () => onEdit(location),
                                    },
                                  ]
                                : []),
                              ...(onDelete
                                ? [
                                    {
                                      label: "Delete Location",
                                      icon: Trash2,
                                      danger: true,
                                      onClick: () => onDelete(location),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        )
                      : undefined
                  }
                >
                  {/* Location Name */}
                  <td className="px-4 py-3 whitespace-nowrap md:px-6 md:py-4">
                    <p className="font-semibold text-slate-900">
                      {location.name || "N/A"}
                    </p>
                  </td>

                  {/* City */}
                  <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                    {location.city || "—"}
                  </td>

                  {/* State */}
                  <td className="px-4 py-3 text-slate-600 md:px-6 md:py-4">
                    {location.state || "—"}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <StatusBadge status={location.status || "INACTIVE"} />
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
