import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";

class TicketTypeService {
  static validateTaxPercent(data) {
    if (data.taxPercent === undefined) return data;

    const taxPercent = Number(data.taxPercent);
    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      throw ApiError.badRequest("Tax percentage must be between 0 and 100");
    }

    return { ...data, taxPercent };
  }

  static async handle(payload) {
    const { action, data } = payload;

    try {
      switch (action) {
        case "create": {
          const createData = this.validateTaxPercent(data);
          return await prisma.ticketType.create({
            data: createData,
          });
        }

        case "update": {
          if (!data.id) throw ApiError.badRequest("ID required");

          const updateData = this.validateTaxPercent(data);
          return await prisma.ticketType.update({
            where: { id: data.id },
            data: updateData,
          });
        }

        // case "delete":
        //   if (!data.id) throw ApiError.badRequest("ID required");

        //   await prisma.ticketType.delete({
        //     where: { id: data.id },
        //   });

        //   return { deleted: true };

        case "delete":
          if (!data?.id) {
            throw ApiError.badRequest("ID required");
          }

          const ticketType = await prisma.ticketType.findUnique({
            where: {
              id: data.id,
            },
            include: {
              _count: {
                select: {
                  tickets: true,
                },
              },
            },
          });

          if (!ticketType) {
            throw ApiError.notFound("Ticket type not found");
          }

          if (ticketType._count.tickets > 0) {
            throw ApiError.badRequest(
              "Cannot delete ticket type because it is already used by tickets"
            );
          }

          await prisma.ticketType.delete({
            where: {
              id: data.id,
            },
          });

          return { deleted: true };

        case "getAll":
          if (!data.allPlaces && !data.placeId) {
            throw ApiError.badRequest("placeId required");
          }

          return await prisma.ticketType.findMany({
            where: data.allPlaces ? {} : { placeId: data.placeId },

            include: {
              place: true,
              ...(data.includeCreator && {
                createdBy: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              }),
            },

            orderBy: {
              createdAt: "desc",
            },
          });

        case "upsert":
          const {
            name,
            center = "Jaipur",
            placeId,
            price,
            isAvailable = true,
            taxPercent = 0,
          } = data;
          const validatedTax = this.validateTaxPercent({ taxPercent });

          return await prisma.ticketType.upsert({
            where: {
              center_name_placeId: { center, name, placeId },
            },
            update: {
              price,
              isAvailable,
              ...validatedTax,
            },
            create: {
              name,
              center,
              placeId,
              price,
              isAvailable,
              ...validatedTax,
            },
          });

        default:
          throw ApiError.badRequest("Invalid action");
      }
    } catch (error) {
      if (error.code === "P2002") {
        throw ApiError.conflict("Ticket type already exists");
      }

      throw error;
    }
  }
}

export default TicketTypeService;
