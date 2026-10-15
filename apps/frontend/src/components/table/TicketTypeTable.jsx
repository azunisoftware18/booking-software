"use client";

import {
  TableHead,
  TableRow,
  TableEmpty,
  TableLoader,
  TableShell,
  TableBody,
} from "@/components/table/core";

import ActionMenu from "../common/ActionMenu";
import { Pencil, Trash } from "lucide-react";
import { useState, useMemo } from "react";
import { useGetMe } from "@/lib/queries/useGetMe";

export default function TicketTypeTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  onView,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10; // ✅ Ek page par kitne items dikhane hain

  // 🔍 Search Logic
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      [
        item.center,
        item.name,
        item.place?.name,
        item.createdBy?.fullName,
        item.createdBy?.email,
      ].some((val) => val?.toLowerCase().includes(search.toLowerCase())),
    );
  }, [data, search]);

  // ✅ Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // Current page ka data nikalne ke liye slice karein
  const currentData = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, page]);

  const { data: me } = useGetMe();

  const permissions =
    me?.data?.permissions ??
    me?.permissions ??
    me?.data?.data?.permissions ??
    [];
  const isSuperAdmin = me?.role?.roleCode === "SUPER_ADMIN";

  const columns = [
    "Location",
    "Ticket Category",
    // "Place",
    "Entry Fees",
    "GST / Tax (%)",
    ...(isSuperAdmin ? ["Created By"] : []),
    "Action",
  ];

  const canUpdateTicketType =
    !isSuperAdmin &&
    permissions.some(
      (permission) =>
        permission.resource === "TICKET_TYPE" &&
        permission.action === "UPDATE" &&
        permission.isActive,
    );

  const canDeleteTicketType =
    !isSuperAdmin &&
    permissions.some(
      (permission) =>
        permission.resource === "TICKET_TYPE" &&
        permission.action === "DELETE" &&
        permission.isActive,
    );

  return (
    <TableShell
      title="Entry Fees"
      subtitle={`${filteredData.length} total entry fees`}
      searchProps={{
        value: search,
        onChange: (e) => {
          setSearch(e.target.value);
          setPage(1);
        },
        onClear: () => {
          setSearch("");
          setPage(1);
        },
        placeholder: "Search entry fee, creator or place...",
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
          <TableEmpty
            colSpan={isSuperAdmin ? 6 : 5}
            message="No entry fees found."
          />
        ) : (
          /* ✅ filteredData ki jagah currentData map karein */
          currentData.map((ticket) => (
            <TableRow
              key={ticket.id}
              renderActions={() =>
                canUpdateTicketType || canDeleteTicketType ? (
                  <ActionMenu
                    items={[
                      ...(canUpdateTicketType
                        ? [
                            {
                              label: "Edit",
                              icon: Pencil,
                              onClick: () => onEdit?.(ticket),
                            },
                          ]
                        : []),

                      ...(canDeleteTicketType
                        ? [
                            {
                              label: "Delete",
                              icon: Trash,
                              danger: true,
                              onClick: () => onDelete?.(ticket),
                            },
                          ]
                        : []),
                    ]}
                  />
                ) : null
              }
            >
              <td className="px-6 py-4 font-semibold text-slate-900">
                {ticket.center || "Jaipur"}
              </td>

              <td className="px-6 py-4 font-semibold text-slate-900">
                {ticket.name}
              </td>

              {/* <td className="px-6 py-4 text-slate-600">
                {ticket.place?.name || "N/A"}
              </td> */}

              <td className="px-6 py-4 font-medium text-slate-800">
                {ticket.isAvailable === false
                  ? "N.A."
                  : Number(ticket.price) === 0
                    ? "Free"
                    : `₹${ticket.price}/-`}
              </td>
              <td className="px-6 py-4 font-medium text-slate-800">
                {Number(ticket.taxPercent || 0)}%
              </td>

              {isSuperAdmin && (
                <td className="px-6 py-4 text-slate-600">
                  <div className="font-medium text-slate-800">
                    {ticket.createdBy?.fullName || "Unknown"}
                  </div>
                  {ticket.createdBy?.email && (
                    <div className="text-xs text-slate-500">
                      {ticket.createdBy.email}
                    </div>
                  )}
                </td>
              )}

            </TableRow>
          ))
        )}
      </TableBody>
    </TableShell>
  );
}
