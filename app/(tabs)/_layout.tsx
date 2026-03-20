import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, router, Tabs } from "expo-router";
import { Dimensions, Pressable, TouchableOpacity, View } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@/context/User";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/utils/colors";
import { fs, hp, sp, wp } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  size: number;
}) {
  return <FontAwesome style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { height } = Dimensions.get("window");
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarStyle: {
          height: hp(80) + insets.bottom,
          alignItems: "center",
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { padding: sp(15), backgroundColor: "#054465", },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="home"
              color={color}
              size={focused ? fs(32) : fs(28)}
            />
          ),
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
          headerStyle: { backgroundColor: COLORS.surfaceAlt },
          headerTitleStyle: { color: "#fff" },
          // tabBarShowLabel: false,
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="search"
              color={color}
              size={focused ? fs(32) : fs(28)}
            />
          ),
          headerTitle: "Search - Vibe",
          headerStyle: { backgroundColor: COLORS.surfaceAlt },
          headerTitleStyle: { color: "#fff" },
          // tabBarStyle: { backgroundColor: "#1A1A2E", flex: 0.1 },
          tabBarHideOnKeyboard: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name="person"
              color={color}
              size={focused ? fs(32) : fs(28)}
            />
          ),
          headerStyle: { backgroundColor: COLORS.surfaceAlt },
          headerTitleStyle: { color: "#fff" },
          // tabBarStyle: { backgroundColor: "#1A1A2E", flex: 0.1 },
          tabBarHideOnKeyboard: true,
        }}
      />
    </Tabs>
  );
}
