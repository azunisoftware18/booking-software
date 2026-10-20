"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAnalyticsReport } from "@/lib/queries/useReport";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ReportsPage() {
  const [filters, setFilters] = useState({ period: "month", from: "", to: "" });
  const { data, isLoading, isError } = useAnalyticsReport(filters);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="min-h-full space-y-6 bg-slate-50 p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Reporting & Analytics</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Centre-wise visitors, revenue and school visit tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <select value={filters.period} onChange={(e) => updateFilter("period", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Annual</option>
          </select>
          <input type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {isLoading && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading report...</div>}
      {isError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">Unable to load analytics.</div>}

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
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-slate-900">Time-based visitor & revenue trend</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [name === "revenue" ? money(value) : value, name]} />
                  <Bar dataKey="paidVisitors" stackId="visitors" fill="#2563eb" name="Paid visitors" />
                  <Bar dataKey="freeVisitors" stackId="visitors" fill="#94a3b8" name="Free visitors" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportTable title="Centre-wise report" rows={data.centres} firstLabel="Centre" />
            <ReportTable title="Venue-wise report" rows={data.venues} firstLabel="Venue" />
          </div>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-900">School visit reporting</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">Coming soon</p>
            <p className="mx-auto mt-1 max-w-xl text-xs text-slate-400">School-wise visitor and student tracking will be added in a separate reporting module.</p>
          </section>
        </>
      )}
    </div>
  );
}

function ReportTable({ title, rows, firstLabel }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black text-slate-900">{title}</h2><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="p-3">{firstLabel}</th><th className="p-3">Visitors</th><th className="p-3">Paid</th><th className="p-3">Free</th><th className="p-3">Revenue</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.visitorCount}</td><td className="p-3">{row.paidVisitors}</td><td className="p-3">{row.freeVisitors}</td><td className="p-3">{money(row.revenue)}</td></tr>) : <tr><td colSpan="5" className="p-6 text-center text-slate-500">No data in this period.</td></tr>}</tbody></table></div></section>;
}
