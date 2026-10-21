// src/controllers/setting.controller.js

import prisma from "../db/db.js";
import fs from "fs";
import path from "path";
import { deleteByKey, upload } from "../utils/s3Service.js";

const settingsUploadDirectory = path.resolve("uploads/settings");

const deleteStoredFile = (storedPath) => {
  if (!storedPath) return;

  const filePath = path.resolve(storedPath.replace(/^\/+/, ""));

  if (
    filePath.startsWith(`${settingsUploadDirectory}${path.sep}`) &&
    fs.existsSync(filePath)
  ) {
    fs.unlinkSync(filePath);
  }
};

const isS3Key = (value) =>
  typeof value === "string" && value && !value.startsWith("/uploads/");

// ================= GET SETTINGS =================

export const getSetting = async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: {
        id: "global-setting",
      },
    });

    return res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

// ================= UPDATE SETTINGS =================

export const updateSetting = async (req, res, next) => {
  try {
    const {
      companyName,
      email,
      phone,
      address,
    } = req.body;

    const existingSetting = await prisma.setting.findUnique({
      where: {
        id: "global-setting",
      },
    });

    const logoFile = req.files?.logo?.[0];
    const faviconFile = req.files?.favicon?.[0];

    let logo = existingSetting?.logo || null;
    let logoKey = existingSetting?.logoKey || null;
    let favicon = existingSetting?.favicon || null;
    let faviconKey = existingSetting?.faviconKey || null;

    // Upload new logo
    if (logoFile) {
      const uploadedLogo = await upload(logoFile.path);
      logo = uploadedLogo.url;
      logoKey = uploadedLogo.key;
    }

    // Upload new favicon
    if (faviconFile) {
      const uploadedFavicon = await upload(faviconFile.path);
      favicon = uploadedFavicon.url;
      faviconKey = uploadedFavicon.key;
    }

    const setting = await prisma.setting.upsert({
      where: {
        id: "global-setting",
      },

      update: {
        companyName,
        email,
        phone,
        address,
        logo,
        logoKey,
        favicon,
        faviconKey,
      },

      create: {
        id: "global-setting",
        companyName,
        email,
        phone,
        address,
        logo,
        logoKey,
        favicon,
        faviconKey,
      },
    });

    if (logoFile) {
      deleteStoredFile(existingSetting?.logo);
      if (isS3Key(existingSetting?.logoKey)) {
        await deleteByKey(existingSetting.logoKey).catch((error) =>
          console.error("Failed to delete old S3 logo:", error),
        );
      }
    }
    if (faviconFile) {
      deleteStoredFile(existingSetting?.favicon);
      if (isS3Key(existingSetting?.faviconKey)) {
        await deleteByKey(existingSetting.faviconKey).catch((error) =>
          console.error("Failed to delete old S3 favicon:", error),
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};
