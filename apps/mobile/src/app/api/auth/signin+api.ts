import { authProxyOptions, proxyAuthRequest } from "@/utils/authApiProxy";

export function OPTIONS() {
  return authProxyOptions();
}

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/auth/signin");
}
