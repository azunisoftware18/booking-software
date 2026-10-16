"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash, MapPin, Calendar, Globe, Image, Clock } from "lucide-react";
import ActionMenu from "../common/ActionMenu";
import { TableEmpty } from "@/components/table/core";
import SearchField from "@/components/ui/SearchField"; // SearchField import karein
import { useGetMe } from "@/lib/queries/useGetMe";
import { ANNEXURE_OPTIONS } from "@/lib/placeAnnexures";

const isLocationPlaceholder = (place) => {
  const placeName = place.name?.trim().toLowerCase();
  const locationName = place.location
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const hasPlaceDetails = Boolean(
    place.imageUrl ||
      place.image ||
      place.images?.[0] ||
      place.annexure ||
      place.annexureOption ||
      place.shortDescription ||
      place.description ||
      place.slotTemplates?.length,
  );

  return Boolean(placeName && locationName === placeName && !hasPlaceDetails);
};

export default function PlaceCards({ data = [], loading, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filteredPlaces = useMemo(() => {
    return data.filter(
      (place) =>
        !isLocationPlaceholder(place) &&
        [place.name, place.location].some((val) =>
          val?.toLowerCase().includes(search.toLowerCase()),
        ),
    );
  }, [data, search]);

  const { data: me } = useGetMe();

  const permissions =
    me?.data?.permissions ??
    me?.permissions ??
    me?.data?.data?.permissions ??
    [];

  const canUpdatePlace = permissions.some(
    (permission) =>
      permission.resource === "PLACE" && permission.action === "UPDATE",
  );

  return (
    // 🔥 FIX: TableShell ki jagah simple div wrapper use karein
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Section (Same as TableShell) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Tourist Places
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {filteredPlaces.length} total places found
          </p>
        </div>

        <div className="w-full sm:w-72">
          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search by name or city..."
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 p-2 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-xl border border-slate-200"
              >
                <div className="h-48 bg-slate-100" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-slate-100" />
                  <div className="h-4 w-1/2 rounded bg-slate-100" />
                  <div className="h-16 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlaces.length === 0 ? (
          <TableEmpty message="No tourist places found matching your search." />
        ) : (
          /* Card Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map((place) => {
              const annexureOption = ANNEXURE_OPTIONS[place.annexure]?.find(
                (option) => option.value === place.annexureOption,
              );
              const venueRates = [
                ["4 hours", annexureOption?.rate4Hours],
                ["8 hours", annexureOption?.rate8Hours],
                ["Per person", annexureOption?.ratePerPerson],
                ["Per student", annexureOption?.ratePerStudent],
              ].filter(([, amount]) => amount != null);
              const slotTemplates = place.slotTemplates || [];

              return (
                <div
                  key={place.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden"
                >
                {place.imageUrl || place.image || place.images?.[0] ? (
                  <img
                    src={place.imageUrl || place.image || place.images?.[0]}
                    alt={`${place.name} venue`}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-400">
                    <Image className="h-10 w-10" aria-hidden="true" />
                  </div>
                )}

                <div className="p-5">
                  {/* Top Row: Name & Action Menu */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {place.name}
                      </h3>
                      <div className="flex items-center text-slate-500 text-sm mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {place.location || "Unknown Location"}
                      </div>
                    </div>

                    <ActionMenu
                      items={[
                        {
                          label: "View",
                          icon: MapPin,
                          onClick: () =>
                            router.push(`/dashboard/place/${place.id}`),
                        },
                        ...(canUpdatePlace
                          ? [
                              {
                                label: "Edit",
                                icon: Pencil,
                                onClick: () => onEdit?.(place),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>

                  {(place.annexure || venueRates.length > 0) && (
                    <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                        {place.annexure
                          ? `Annexure ${place.annexure} · ${annexureOption?.label || place.annexureOption}`
                          : annexureOption?.label}
                      </p>
                      {venueRates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-emerald-700">
                          {venueRates.map(([label, amount]) => (
                            <span key={label}>
                              {label}: ₹{Number(amount).toLocaleString("en-IN")}
                            </span>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {(place.shortDescription || place.description) && (
                    <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {place.shortDescription || place.description}
                    </p>
                  )}

                  {slotTemplates.length > 0 && (
                    <section className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                        <Clock className="h-3.5 w-3.5" />
                        Booking slots
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {slotTemplates.map((slot) => (
                          <span
                            key={slot.id || `${slot.startTime}-${slot.endTime}`}
                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                          >
                            {slot.startTime}–{slot.endTime} · {slot.capacity} seats
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Coordinates Section */}
                  {/* <div className="bg-slate-50 rounded-lg p-3 flex justify-between mb-4">
                    <div className="text-center flex-1 border-r border-slate-200">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Latitude
                      </p>
                      <p className="font-mono text-sm text-slate-700">
                        {place.latitude?.toFixed(6) ?? "0.000000"}
                      </p>
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Longitude
                      </p>
                      <p className="font-mono text-sm text-slate-700">
                        {place.longitude?.toFixed(6) ?? "0.000000"}
                      </p>
                    </div>
                  </div> */}

                  <div className="flex items-center pt-4 border-t border-slate-100 mt-auto">
                    <div className="flex items-center text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      {new Date(place.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
