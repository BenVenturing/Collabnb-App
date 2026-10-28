// Profile tab icon: the signed-in user's photo, ringed in ink when the tab is
// active (Airbnb / WhatsApp). Falls back to the plain User glyph.

import { View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { User } from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { colors } from "@/config/theme";

export default function TabAvatar({ color, focused, size = 24 }) {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const uri = profile?.avatar_url || user?.imageUrl;

  if (!uri) return <User color={color} size={22} />;
  return (
    <View
      style={{
        width: size + 4,
        height: size + 4,
        borderRadius: (size + 4) / 2,
        borderWidth: 2,
        borderColor: focused ? colors.ink : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
    </View>
  );
}
