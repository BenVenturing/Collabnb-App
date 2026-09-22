import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

const loadEnvFile = () => {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();

const remoteBaseUrl = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/$/, "");

if (!remoteBaseUrl) {
  throw new Error("EXPO_PUBLIC_BASE_URL is required for dev auth proxy");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    ...corsHeaders,
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/api/auth/")) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const upstream = await fetch(`${remoteBaseUrl}${req.url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    const text = await upstream.text();

    res.writeHead(upstream.status, {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Proxy request failed",
    });
  }
});

server.listen(port, () => {
  console.log(`[dev-auth-proxy] listening on http://localhost:${port}`);
  console.log(`[dev-auth-proxy] forwarding auth requests to ${remoteBaseUrl}`);
});
