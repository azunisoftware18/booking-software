import prisma from "../db/db.js";
import BookingService from "./booking.service.js";
import { ApiError } from "../utils/ApiError.js";

const COMPLETED_STATUSES = new Set(["PAID", "COMPLETED"]);

const toDate = (value, fallback) => {
  const date = value ? new Date(`${value}T00:00:00.000Z`) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const periodKey = (date, period) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  if (period === "year") return String(year);
  if (period === "quarter") return `${year}-Q${Math.ceil(month / 3)}`;
  if (period === "month") return `${year}-${String(month).padStart(2, "0")}`;
  return date.toISOString().slice(0, 10);
};

const addToGroup = (map, key, value) => {
  const current = map.get(key) || {
    id: value.id,
    name: value.name,
    visitorCount: 0,
    paidVisitors: 0,
    freeVisitors: 0,
    revenue: 0,
    bookings: 0,
  };
  current.visitorCount += value.visitorCount;
  current.paidVisitors += value.paidVisitors;
  current.freeVisitors += value.freeVisitors;
  current.revenue += value.revenue;
  current.bookings += 1;
  map.set(key, current);
};

class ReportService {
  static async getAnalytics(currentUser, query) {
    const scope = BookingService.getBookingScope(currentUser);
    if (!scope) throw ApiError.forbidden("No reporting scope assigned");

    const now = new Date();
    const from = toDate(query.from, new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
    const to = query.to
      ? new Date(`${query.to}T23:59:59.999Z`)
      : new Date();
    const period = ["day", "month", "quarter", "year"].includes(query.period)
      ? query.period
      : "month";

    const bookings = await prisma.booking.findMany({
      where: {
        ...scope,
        createdAt: { gte: from, lte: to },
        status: { in: [...COMPLETED_STATUSES] },
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.placeId ? { placeId: query.placeId } : {}),
      },
      select: {
        id: true,
        createdAt: true,
        totalAmount: true,
        totalSeats: true,
        place: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    const totals = {
      visitorCount: 0,
      paidVisitors: 0,
      freeVisitors: 0,
      revenue: 0,
      bookings: bookings.length,
    };
    const centres = new Map();
    const venues = new Map();
    const timeline = new Map();

    for (const booking of bookings) {
      const visitors = Number(booking.totalSeats || 0);
      const revenue = Number(booking.totalAmount || 0);
      const paid = revenue > 0 ? visitors : 0;
      const free = revenue === 0 ? visitors : 0;
      const value = { visitorCount: visitors, paidVisitors: paid, freeVisitors: free, revenue };

      totals.visitorCount += visitors;
      totals.paidVisitors += paid;
      totals.freeVisitors += free;
      totals.revenue += revenue;
      addToGroup(centres, booking.location.id, { ...value, id: booking.location.id, name: booking.location.name });
      addToGroup(venues, booking.place.id, { ...value, id: booking.place.id, name: booking.place.name });

      const key = periodKey(new Date(booking.createdAt), period);
      const point = timeline.get(key) || { period: key, visitorCount: 0, paidVisitors: 0, freeVisitors: 0, revenue: 0 };
      point.visitorCount += visitors;
      point.paidVisitors += paid;
      point.freeVisitors += free;
      point.revenue += revenue;
      timeline.set(key, point);

    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      period,
      totals,
      centres: [...centres.values()].sort((a, b) => b.visitorCount - a.visitorCount),
      venues: [...venues.values()].sort((a, b) => b.visitorCount - a.visitorCount),
      timeline: [...timeline.values()].sort((a, b) => a.period.localeCompare(b.period)),
      schoolVisits: [],
    };
  }
}

export default ReportService;
