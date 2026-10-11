import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';

const originalFetch = fetch;
const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

const getURLFromArgs = (...args: Parameters<typeof fetch>) => {
  const [urlArg] = args;
  let url: string | null;
  if (typeof urlArg === 'string') {
    url = urlArg;
  } else if (typeof urlArg === 'object' && urlArg !== null) {
    // A Request exposes `.url`, a URL object exposes `.href`. Without the
    // href branch a URL argument yields undefined here, and the caller below
    // treats "no URL" as unclassifiable and falls through to expoFetch —
    // which is how Clerk (it passes URL objects) ended up off the native
    // transport, failing and retrying /v1/client and /v1/environment until
    // it gave up initializing and returned all-null resources.
    const asRecord = urlArg as { url?: unknown; href?: unknown };
    url =
      typeof asRecord.url === 'string'
        ? asRecord.url
        : typeof asRecord.href === 'string'
          ? asRecord.href
          : null;
  } else {
    url = null;
  }
  return url;
};

const isFileURL = (url: string) => {
  return url.startsWith('file://') || url.startsWith('data:');
};

// Keep Clerk's Frontend API on the native transport. It is auth-critical and
// needs no first-party headers, and native fetch is the path its request and
// response handling is verified against here; routing it through expo/fetch
// is untested and a failure there degrades silently (Clerk retries, never
// finishes initializing, then hands back all-null resources).
const isClerkURL = (url: string) => {
  const host = url.match(/^https?:\/\/([^/?#]+)/i)?.[1]?.toLowerCase();
  if (!host) return false;
  return (
    host.startsWith('clerk.') ||
    host.endsWith('.clerk.accounts.dev') ||
    host.endsWith('.clerk.com')
  );
};

const isFirstPartyURL = (url: string) => {
  return (
    url.startsWith('/') ||
    (process.env.EXPO_PUBLIC_BASE_URL && url.startsWith(process.env.EXPO_PUBLIC_BASE_URL))
  );
};

const isSecondPartyURL = (url: string) => {
  return url.startsWith('/_create/');
};

const isAuthApiURL = (url: string) => {
  return url.startsWith('/api/auth/');
};

const getLocalOrigin = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return null;
  }

  const { origin, hostname } = window.location;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  ) {
    return origin;
  }

  return null;
};

const getLocalAuthProxyBase = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return process.env.EXPO_PUBLIC_WEB_AUTH_PROXY_URL || 'http://localhost:3001';
};

type Params = Parameters<typeof expoFetch>;
const fetchToWeb = async function fetchWithHeaders(...args: Params) {
  const localOrigin = getLocalOrigin();
  const firstPartyURL = localOrigin ?? process.env.EXPO_PUBLIC_BASE_URL;
  const secondPartyURL = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
  const [input, init] = args;
  const url = getURLFromArgs(input, init);
  if (!url) {
    return expoFetch(input, init);
  }

  if (isFileURL(url) || isClerkURL(url)) {
    return originalFetch(input, init);
  }

  const isExternalFetch = !isFirstPartyURL(url);
  // we should not add headers to requests that don't go to our own server
  if (isExternalFetch) {
    return expoFetch(input, init);
  }

  let finalInput = input;
  const isLocalAuthProxyRequest = isAuthApiURL(url) && !!localOrigin;
  const baseURL = isLocalAuthProxyRequest
    ? getLocalAuthProxyBase()
    : isSecondPartyURL(url)
      ? secondPartyURL
      : firstPartyURL;
  if (typeof input === 'string') {
    finalInput = input.startsWith('/') ? `${baseURL}${input}` : input;
  } else {
    return expoFetch(input, init);
  }

  const initHeaders = init?.headers ?? {};
  const finalHeaders = new Headers(initHeaders);

  const headers = isLocalAuthProxyRequest
    ? {}
    : {
        'x-createxyz-project-group-id': process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
        host: process.env.EXPO_PUBLIC_HOST,
        'x-forwarded-host': process.env.EXPO_PUBLIC_HOST,
        'x-createxyz-host': process.env.EXPO_PUBLIC_HOST,
      };

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      finalHeaders.set(key, value);
    }
  }

  const auth = await SecureStore.getItemAsync(authKey)
    .then((auth) => {
      return auth ? JSON.parse(auth) : null;
    })
    .catch(() => {
      return null;
    });

  if (auth) {
    finalHeaders.set('authorization', `Bearer ${auth.jwt}`);
  }

  return expoFetch(finalInput, {
    ...init,
    headers: finalHeaders,
  });
};

export default fetchToWeb;
