// Trial-ended upsell — the App Store requires native IAP (not Stripe) for
// unlocking in-app digital content, so this uses RevenueCat (useInAppPurchase)
// where the website's equivalent (SubscriptionContext) uses Stripe Checkout.

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { X, Check } from "lucide-react-native";
import { colors, fonts, radii, shadows } from "@/config/theme";
import { api } from "@/convex/_generated/api";
import useInAppPurchase from "@/utils/iap/useInAppPurchase";

export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Same profile lookup as the Explore tab (useAccessGate's caller) — needed
  // here so RevenueCat's appUserID can be set to our own profile id, which is
  // what lets the RevenueCat webhook update the right Convex row.
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");

  const {
    isReady,
    isPurchasing,
    initiate,
    getAvailableSubscriptions,
    purchasePackage,
    restorePurchases,
  } = useInAppPurchase(profile?._id);

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (profile?._id) initiate();
  }, [profile?._id, initiate]);

  const packages = getAvailableSubscriptions();
  const selected = packages.find((p) => p.identifier === selectedId) || packages[0];

  const handleSubscribe = async () => {
    if (!selected) return;
    const result = await purchasePackage({ pkg: selected });
    if (result.success) {
      router.back();
    } else if (!result.cancelled) {
      Alert.alert("Purchase failed", "Something went wrong — please try again.");
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.success) {
      router.back();
    } else {
      Alert.alert("Nothing to restore", "No active subscription was found for this account.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bone }}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, alignItems: "flex-end" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadows.sm }}
        >
          <X color={colors.ink} size={18} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: 8 }}>
          Your trial has ended
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, lineHeight: 20 }}>
          Subscribe to keep browsing collaborations and messaging hosts.
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        {!isReady ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.slate} />
          </View>
        ) : packages.length === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.sage, textAlign: "center", marginTop: 40 }}>
            No plans are available right now — please try again shortly.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {packages.map((pkg) => {
              const active = (selected?.identifier ?? packages[0]?.identifier) === pkg.identifier;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  onPress={() => setSelectedId(pkg.identifier)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16,
                    borderWidth: active ? 1.5 : 1, borderColor: active ? colors.ink : colors.hairline,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 15, color: colors.ink }}>
                      {pkg.product.title || pkg.identifier}
                    </Text>
                    {pkg.product.description ? (
                      <Text numberOfLines={2} style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 2 }}>
                        {pkg.product.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 15, color: colors.ink, marginRight: active ? 8 : 0 }}>
                    {pkg.product.priceString}
                  </Text>
                  {active && (
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                      <Check color="#fff" size={13} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, gap: 14 }}>
        <TouchableOpacity
          onPress={handleSubscribe}
          disabled={!selected || isPurchasing}
          activeOpacity={0.9}
          style={{
            backgroundColor: colors.ink, borderRadius: radii.pill, paddingVertical: 16,
            alignItems: "center", opacity: !selected || isPurchasing ? 0.6 : 1,
          }}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: "#fff" }}>Subscribe</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={isPurchasing} style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.sage }}>Restore purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
