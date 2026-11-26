"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { useAnalyticsReport } from "@/lib/queries/useReport";
import Button from "@/components/ui/Button";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ReportsPage() {
  const [filters, setFilters] = useState({ period: "month", from: "", to: "" });
  const { data, isLoading, isError } = useAnalyticsReport(filters);

  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const exportReport = () => {
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    const addWorksheet = (name, headers, rows, widths) => {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      worksheet["!cols"] = widths.map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    };

    addWorksheet(
      "Summary",
      ["Metric", "Value"],
      [
        ["Period", data.period],
        ["From", data.from?.slice(0, 10) || ""],
        ["To", data.to?.slice(0, 10) || ""],
        [],
        ["Visitors", data.totals.visitorCount],
        ["Paid visitors", data.totals.paidVisitors],
        ["Free visitors", data.totals.freeVisitors],
        ["Revenue", data.totals.revenue],
        ["Bookings", data.totals.bookings],
      ],
      [24, 20],
    );

    const breakdownHeaders = [
      "Name",
      "Visitors",
      "Paid Visitors",
      "Free Visitors",
      "Revenue",
    ];
    const breakdownWidths = [28, 14, 18, 18, 18];
    const breakdownRows = (rows) =>
      rows.map((row) => [
        row.name,
        row.visitorCount,
        row.paidVisitors,
        row.freeVisitors,
        row.revenue,
      ]);

    addWorksheet(
      "Centres",
      breakdownHeaders,
      breakdownRows(data.centres),
      breakdownWidths,
    );
    addWorksheet(
      "Venues",
      breakdownHeaders,
      breakdownRows(data.venues),
      breakdownWidths,
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    XLSX.writeFile(
      workbook,
      `analytics_report_${filters.period}_${timestamp}.xlsx`,
    );
  };

  return (
    <div className="min-h-full space-y-6 bg-slate-50 p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Reporting & Analytics
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Centre-wise visitors, revenue and school visit tracking.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <Button
            text="Download Report"
            onClick={exportReport}
            disabled={!data || isLoading || isError}
          />
          <select
            value={filters.period}
            onChange={(e) => updateFilter("period", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Annual</option>
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
          Loading report...
        </div>
      )}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Unable to load analytics.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Visitors", data.totals.visitorCount],
              ["Paid visitors", data.totals.paidVisitors],
              ["Free visitors", data.totals.freeVisitors],
              ["Revenue", money(data.totals.revenue)],
              ["Bookings", data.totals.bookings],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">
              Time-based visitor & revenue trend
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? money(value) : value,
                      name,
                    ]}
                  />
                  <Bar
                    dataKey="paidVisitors"
                    stackId="visitors"
                    fill="#2563eb"
                    name="Paid visitors"
                  />
                  <Bar
                    dataKey="freeVisitors"
                    stackId="visitors"
                    fill="#94a3b8"
                    name="Free visitors"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportTable
              title="Centre-wise report"
              rows={data.centres}
              firstLabel="Centre"
            />
            <ReportTable
              title="Venue-wise report"
              rows={data.venues}
              firstLabel="Venue"
            />
          </div>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              School visit reporting
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Coming soon
            </p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-slate-400">
              School-wise visitor and student tracking will be added in a
              separate reporting module.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function ReportTable({ title, rows, firstLabel }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-900">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
              <th className="p-3">{firstLabel}</th>
              <th className="p-3">Visitors</th>
              <th className="p-3">Paid</th>
              <th className="p-3">Free</th>
              <th className="p-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-3 font-semibold">{row.name}</td>
                  <td className="p-3">{row.visitorCount}</td>
                  <td className="p-3">{row.paidVisitors}</td>
                  <td className="p-3">{row.freeVisitors}</td>
                  <td className="p-3">{money(row.revenue)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500">
                  No data in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
