const allowedProviders = new Set(["create", "convex"]);

function normalizeProvider(value) {
  if (!value) return "create";
  const normalized = String(value).trim().toLowerCase();
  return allowedProviders.has(normalized) ? normalized : "create";
}

export const backendProvider = normalizeProvider(
  import.meta.env.VITE_BACKEND_PROVIDER
);

export const isConvexBackend = backendProvider === "convex";

export const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

export const backendConfig = {
  provider: backendProvider,
  convexUrl,
};

export default backendConfig;
