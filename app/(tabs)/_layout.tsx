import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, router, Tabs } from "expo-router";
import { Dimensions, Pressable, TouchableOpacity, View } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { height } = Dimensions.get("window");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: { flex: 0.1, alignItems: "center" },
        tabBarItemStyle: { padding: 15, backgroundColor: "#1A1A2E" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerLeft: () => (
            <Link href="/(tabs)" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="music"
                    size={25}
                    color="#fff"
                    style={{
                      marginLeft: 15,
                      marginRight: 5,
                      opacity: pressed ? 0.5 : 1,
                    }}
                  />
                )}
              </Pressable>
            </Link>
          ),
          headerTitle: "Vibe",
          headerStyle: { backgroundColor: "#1A1A2E" },
          headerTitleStyle: { color: "#fff" },
          headerRight: () => {
            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  onPress={() => router.navigate({ pathname: "/updates" })}
                  style={{ marginRight: 20 }}
                >
                  <MaterialIcons name="update" size={25} color={"#fff"} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.navigate({ pathname: "/downloaded" })}
                  style={{ marginRight: 20 }}
                >
                  <FontAwesome6 name="download" size={20} color={"#fff"} />
                </TouchableOpacity>
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
          headerTitle: "Search - Vibe",
          headerStyle: { backgroundColor: "#1A1A2E" },
          headerTitleStyle: { color: "#fff" },
          // tabBarStyle: { backgroundColor: "#1A1A2E", flex: 0.1 },
          tabBarHideOnKeyboard: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
          headerStyle: { backgroundColor: "#1A1A2E" },
          headerTitleStyle: { color: "#fff" },
          // tabBarStyle: { backgroundColor: "#1A1A2E", flex: 0.1 },
          tabBarHideOnKeyboard: true,
        }}
      />
    </Tabs>
  );
}
