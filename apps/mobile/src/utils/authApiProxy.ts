const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const getRemoteBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_BASE_URL is not configured");
  }
  return baseUrl.replace(/\/$/, "");
};

export function authProxyOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function proxyAuthRequest(request: Request, path: string) {
  try {
    const bodyText = await request.text();
    const remoteUrl = `${getRemoteBaseUrl()}${path}`;

    const response = await fetch(remoteUrl, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyText,
    });

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Auth proxy request failed",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
