// src/controllers/setting.controller.js

import prisma from "../db/db.js";
import fs from "fs";
import path from "path";

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

const getUploadedFilePath = (file) =>
  file ? `/uploads/settings/${file.filename}` : null;

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
      deleteStoredFile(existingSetting?.logo);
      logo = getUploadedFilePath(logoFile);
      logoKey = logo;
    }

    // Upload new favicon
    if (faviconFile) {
      deleteStoredFile(existingSetting?.favicon);
      favicon = getUploadedFilePath(faviconFile);
      faviconKey = favicon;
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

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully.",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};
