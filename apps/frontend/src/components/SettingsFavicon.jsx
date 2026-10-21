"use client";

import { useEffect } from "react";
import { useGetSetting } from "@/lib/queries/useSetting";
import { getUploadedAssetUrl } from "@/lib/assetUrl";

const getFaviconType = (faviconUrl) => {
  if (/\.ico($|\?)/i.test(faviconUrl)) return "image/x-icon";
  if (/\.webp($|\?)/i.test(faviconUrl)) return "image/webp";
  if (/\.jpe?g($|\?)/i.test(faviconUrl)) return "image/jpeg";

  return "image/png";
};

export default function SettingsFavicon() {
  const { data } = useGetSetting();
  const setting = data?.data ?? data;

  useEffect(() => {
    const faviconUrl = getUploadedAssetUrl(setting?.favicon);
    const companyName = setting?.companyName?.trim();

    if (companyName) {
      document.title = companyName;
    }

    if (!faviconUrl) return;

    const cacheBustedUrl = `${faviconUrl}?v=${encodeURIComponent(
      setting?.updatedAt || setting?.favicon,
    )}`;
    const faviconLinks = document.querySelectorAll("link[rel~='icon']");

    if (faviconLinks.length === 0) {
      const faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = getFaviconType(faviconUrl);
      faviconLink.href = cacheBustedUrl;
      document.head.appendChild(faviconLink);
      return;
    }

    faviconLinks.forEach((faviconLink) => {
      faviconLink.href = cacheBustedUrl;
      faviconLink.type = getFaviconType(faviconUrl);
      faviconLink.dataset.settingsFavicon = "true";
    });
  }, [setting?.companyName, setting?.favicon, setting?.updatedAt]);

  return null;
}
