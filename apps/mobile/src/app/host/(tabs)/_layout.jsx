import { Tabs } from "expo-router";
import { View } from "react-native";
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  Users,
} from "lucide-react-native";
import ThemedBackground from "@/components/ThemedBackground";
import GlassTabBar from "@/components/GlassTabBar";
import TabAvatar from "@/components/TabAvatar";
import { useConversations } from "@/hooks/useConversations";

export default function HostTabLayout() {
  const { unreadCount } = useConversations(); // drives the Inbox tab badge
  return (
    <ThemedBackground style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="proposals"
          options={{
            title: "Proposals",
            tabBarIcon: ({ color, size }) => (
              <FileText color={color} size={22} />
            ),
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
          name="creators"
          options={{
            title: "Creators",
            tabBarIcon: ({ color, size }) => <Users color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => <TabAvatar color={color} focused={focused} />,
          }}
        />
      </Tabs>
    </ThemedBackground>
  );
}
