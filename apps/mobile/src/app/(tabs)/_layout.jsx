import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  Search,
  Briefcase,
  MessageCircle,
  User,
  Heart,
} from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";
import GlassTabBar from "@/components/GlassTabBar";
import { useConversations } from "@/hooks/useConversations";

export default function TabLayout() {
  const { unreadCount } = useConversations(); // drives the Inbox tab badge
  return (
    <ThemedBackground style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => <Search color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="collaborations"
          options={{
            title: "Collabs",
            tabBarIcon: ({ color, size }) => (
              <Briefcase color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: "Saved",
            tabBarIcon: ({ color, size }) => <Heart color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarIcon: ({ color, size }) => (
              <MessageCircle color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="conversation"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile-edit"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ThemedBackground>
  );
}
