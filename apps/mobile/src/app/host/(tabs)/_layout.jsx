import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import useRoleStore from "@/utils/RoleStore";
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
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip");
  const { setRole } = useRoleStore();

  // The device's stored role and onboarding status can say "host" for an account
  // the server never approved as one, so Convex decides once the profile loads.
  const notHost =
    !!profile &&
    profile.is_admin !== true &&
    profile.host_verified !== true &&
    profile.role !== "host";

  useEffect(() => {
    if (notHost) setRole("creator");
  }, [notHost, setRole]);

  if (notHost) return <Redirect href="/explore" />;

  return (
    <ThemedBackground style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
          >
            <GlassTabBar {...props} />
          </View>
        )}
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
