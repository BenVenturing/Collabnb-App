import Purchases, { LOG_LEVEL, PRODUCT_CATEGORY } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { useInAppPurchaseStore } from './store';
import convexClient from '@/config/convexClient';
import { api } from '@/convex/_generated/api';

export const RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1500;

export const getRevenueCatAPIKey = () => {
  if (process.env.EXPO_PUBLIC_CREATE_ENV === 'DEVELOPMENT') {
    return process.env.EXPO_PUBLIC_REVENUE_CAT_TEST_STORE_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUE_CAT_APP_STORE_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUE_CAT_PLAY_STORE_API_KEY,
    web: process.env.EXPO_PUBLIC_REVENUE_CAT_TEST_STORE_API_KEY,
  });
};

export async function loadOfferings(setOfferings) {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await Purchases.getOfferings();
      if (result?.current) {
        setOfferings(result);
        return;
      }
      console.warn(
        `RevenueCat offerings loaded but no current offering (attempt ${attempt + 1}/${RETRY_ATTEMPTS})`
      );
    } catch (error) {
      console.warn(
        `Failed to load offerings (attempt ${attempt + 1}/${RETRY_ATTEMPTS}):`,
        error
      );
    }
    if (attempt < RETRY_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

// Server-side truth, not RevenueCat's local cache — this is the same
// api.gates.getMyAccess check the web app and useAccessGate() use, so it
// reflects a Stripe web subscription too (RevenueCat webhook -> Convex ->
// here), not just this device's IAP state.
export async function fetchSubscriptionStatus(setIsSubscribed, profileId) {
  if (!profileId || !convexClient) {
    setIsSubscribed(false);
    return;
  }
  try {
    const access = await convexClient.query(api.gates.getMyAccess, { profileId });
    setIsSubscribed(Boolean(access?.canAccess));
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    setIsSubscribed(false);
  }
}

// profileId is our Convex profiles._id — passed as RevenueCat's appUserID so
// the RevenueCat webhook (convex/http.ts) can update this exact profile
// without a separate id-mapping step. Call only once profileId is known
// (subscribe.jsx waits for the profile query) so RC never configures
// anonymously and needs a later logIn() alias.
export async function initiatePurchases({
  isConfigured,
  setIsReady,
  setOfferings,
  setIsSubscribed,
  profileId,
}) {
  if (isConfigured.current) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.INFO);
    const apiKey = getRevenueCatAPIKey();
    if (apiKey) {
      Purchases.configure(profileId ? { apiKey, appUserID: profileId } : { apiKey });
      isConfigured.current = true;
      await Promise.allSettled([
        loadOfferings(setOfferings),
        fetchSubscriptionStatus(setIsSubscribed, profileId),
      ]);
    } else {
      console.warn('No RevenueCat API key found for platform:', Platform.OS);
    }
  } catch (error) {
    console.warn('Failed to initialize RevenueCat:', error);
  } finally {
    setIsReady(true);
  }
}

export function getAvailablePackagesFromOfferings(offerings) {
  const offering = offerings?.current;
  if (!offering) {
    return [];
  }
  return offering.availablePackages;
}

export function getSubscriptionsFromOfferings(offerings) {
  return getAvailablePackagesFromOfferings(offerings).filter(
    (pkg) => pkg.product.productCategory === PRODUCT_CATEGORY.SUBSCRIPTION
  );
}

export async function executePurchase({ pkg, setIsSubscribed, profileId }) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    // The RevenueCat webhook writes to Convex asynchronously — this refetch
    // can briefly race it and read stale state. The screen closes on
    // `success` regardless (RC's own purchase confirmation is authoritative
    // for the UI), so this is only for the in-memory isSubscribed flag.
    await fetchSubscriptionStatus(setIsSubscribed, profileId);
    return { success: true, customerInfo };
  } catch (error) {
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.error('Failed to purchase:', error);
    return { success: false, cancelled: false };
  }
}

export async function executeRestore(setIsSubscribed, profileId) {
  try {
    const customerInfo = await Purchases.restorePurchases();
    await fetchSubscriptionStatus(setIsSubscribed, profileId);
    return {
      success: Object.keys(customerInfo.entitlements.active).length > 0,
      customerInfo,
    };
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return { success: false };
  }
}

export function useInAppPurchase(profileId) {
  const {
    isReady,
    offerings,
    setOfferings,
    setIsSubscribed,
    isSubscribed,
    setIsReady,
  } = useInAppPurchaseStore();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const isConfigured = useRef(false);

  const initiate = useCallback(
    () =>
      initiatePurchases({
        isConfigured,
        setIsReady,
        setOfferings,
        setIsSubscribed,
        profileId,
      }),
    [setIsReady, setOfferings, setIsSubscribed, profileId]
  );

  const getAvailablePackages = useCallback(
    () => getAvailablePackagesFromOfferings(offerings),
    [offerings]
  );

  const getAvailableSubscriptions = useCallback(
    () => getSubscriptionsFromOfferings(offerings),
    [offerings]
  );

  const purchasePackage = useCallback(
    async ({ pkg }) => {
      setIsPurchasing(true);
      try {
        return await executePurchase({ pkg, setIsSubscribed, profileId });
      } finally {
        setIsPurchasing(false);
      }
    },
    [setIsPurchasing, setIsSubscribed, profileId]
  );

  const restorePurchases = useCallback(async () => {
    setIsPurchasing(true);
    try {
      return await executeRestore(setIsSubscribed, profileId);
    } finally {
      setIsPurchasing(false);
    }
  }, [setIsPurchasing, setIsSubscribed, profileId]);

  return {
    isReady,
    offerings,
    isSubscribed,
    isPurchasing,
    initiate,
    getAvailablePackages,
    getAvailableSubscriptions,
    purchasePackage,
    restorePurchases,
  };
}

export default useInAppPurchase;
