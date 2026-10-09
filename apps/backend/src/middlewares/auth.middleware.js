import jwt from "jsonwebtoken";
import prisma from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import { envConfig } from "../config/env.config.js";

class AuthMiddleware {
  /**
   * Get access token from request
   */
  static getToken = (req) => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }

    return req.cookies?.accessToken || null;
  };

  /**
   * Get authenticated user from token
   */
  static getUserFromToken = async (token) => {
    const decoded = jwt.verify(
      token,
      envConfig.ACCESS_TOKEN_SECRET
    );

    if (!decoded?.id) {
      throw ApiError.unauthorized("Invalid access token");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,

        // Required for permission middleware
        roleId: true,
        placeId: true,

        role: {
          select: {
            id: true,
            roleName: true,
            roleCode: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.unauthorized("Invalid token user");
    }

    return user;
  };

  /**
   * Required authentication
   *
   * User must be logged in.
   */
  static isAuthenticated = async (req, res, next) => {
    try {
      const token = AuthMiddleware.getToken(req);

      if (!token) {
        throw ApiError.unauthorized("No token provided");
      }

      const user = await AuthMiddleware.getUserFromToken(token);

      req.user = user;

      return next();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Optional authentication
   *
   * Logged-in user:
   *   req.user = user
   *
   * Guest:
   *   req.user = null
   *
   * Used for public booking APIs where
   * both guests and logged-in users are allowed.
   */
  static optionalAuthentication = async (req, res, next) => {
    try {
      const token = AuthMiddleware.getToken(req);

      // No token = guest
      if (!token) {
        req.user = null;
        return next();
      }

      try {
        const user = await AuthMiddleware.getUserFromToken(token);

        req.user = user;
      } catch (error) {
        // Invalid/expired token = guest
        req.user = null;
      }

      return next();
    } catch (error) {
      req.user = null;
      return next();
    }
  };

  /**
   * Role based authorization
   *
   * Keep this for legacy/special routes.
   *
   * Example:
   * AuthMiddleware.authorize(["SUPER_ADMIN"])
   */
  static authorize = (roles = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return next(
          ApiError.unauthorized("User not authenticated")
        );
      }

      const userRole = req.user.role?.roleCode;

      if (!roles.includes(userRole)) {
        return next(
          ApiError.forbidden("Access denied")
        );
      }

      return next();
    };
  };
}

export default AuthMiddleware;