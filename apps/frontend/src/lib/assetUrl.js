export const getUploadedAssetUrl = (assetPath) => {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const backendUrl = apiUrl.replace(/\/api$/, "");

  return `${backendUrl}${assetPath}`;
};
