const allowedProviders = new Set(["create", "convex"]);

const normalizeProvider = (value) => {
  if (!value) return "create";
  const normalized = String(value).trim().toLowerCase();
  return allowedProviders.has(normalized) ? normalized : "create";
};

export const backendProvider = normalizeProvider(
  process.env.EXPO_PUBLIC_BACKEND_PROVIDER
);

export const isConvexBackend = backendProvider === "convex";

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "";

export const backendConfig = {
  provider: backendProvider,
  convexUrl,
};

export default backendConfig;
