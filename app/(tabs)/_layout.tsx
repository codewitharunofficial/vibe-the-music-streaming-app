import React, { useEffect, useRef } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, router, Tabs } from "expo-router";
import {
  Animated,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/utils/colors";
import { fs, hp, sp } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Design tokens (same palette as the rest of the app)
const UI = {
  bar: "#06283B", // tab bar surface
  accent: "#FF9F1C",
  accentSoft: "rgba(255,159,28,0.16)",
  inactive: "rgba(255,255,255,0.5)",
  glass: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.10)",
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// Tab icon: outline when idle, filled when selected, with an animated
// highlight pill behind it.
function TabIcon({
  focused,
  name,
  outlineName,
}: {
  focused: boolean;
  name: IoniconName;
  outlineName: IoniconName;
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [focused, progress]);

  const pillScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const lift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });

  return (
    <View style={styles.iconWrap}>
      <Animated.View
        style={[
          styles.pill,
          { opacity: progress, transform: [{ scale: pillScale }] },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY: lift }] }}>
        <Ionicons
          name={focused ? name : outlineName}
          size={fs(24)}
          color={focused ? UI.accent : UI.inactive}
        />
      </Animated.View>
    </View>
  );
}

// Round glass button used in the header
function HeaderButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.headerButton}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // ----- Tab bar -----
        tabBarActiveTintColor: UI.accent,
        tabBarInactiveTintColor: UI.inactive,
        tabBarStyle: {
          height: hp(80) + insets.bottom,
          alignItems: "center",
          paddingBottom: insets.bottom,
          backgroundColor: UI.bar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: UI.hairline,
          elevation: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarItemStyle: { paddingTop: sp(10), paddingBottom: sp(6) },
        tabBarLabelStyle: {
          fontSize: fs(11),
          fontWeight: "700",
          letterSpacing: 0.2,
        },

        // ----- Header (shared by every tab) -----
        headerStyle: { backgroundColor: COLORS.surfaceAlt },
        headerTitleStyle: {
          color: "#fff",
          fontWeight: "800",
          letterSpacing: -0.3,
        },
        headerTintColor: "#fff",
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="home" outlineName="home-outline" />
          ),
          headerLeft: () => (
            <Link href={"/about"} asChild>
              <Pressable>
                {({ pressed }) => (
                  <View
                    style={[styles.logoBadge, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <FontAwesome name="music" size={18} color={UI.accent} />
                  </View>
                )}
              </Pressable>
            </Link>
          ),
          headerTitle: "Vibe",
          // tabBarShowLabel: false,
          headerRight: () => {
            return (
              <View style={styles.headerRight}>
                <HeaderButton
                  onPress={() => router.navigate({ pathname: "/updates" })}
                >
                  <MaterialIcons name="update" size={22} color={"#fff"} />
                </HeaderButton>
                <HeaderButton
                  onPress={() => router.navigate({ pathname: "/downloaded" })}
                >
                  <FontAwesome6 name="download" size={17} color={"#fff"} />
                </HeaderButton>
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="search"
              outlineName="search-outline"
            />
          ),
          headerTitle: "Search - Vibe",
          // tabBarStyle: { backgroundColor: "#1A1A2E", flex: 0.1 },
          tabBarHideOnKeyboard: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="person"
              outlineName="person-outline"
            />
          ),
          // tabBarStyle: { backgroundColor: "#1A1A2E", flex: 0.1 },
          tabBarHideOnKeyboard: true,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: sp(60),
    height: sp(34),
    alignItems: "center",
    justifyContent: "center",
  },

  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: sp(17),
    backgroundColor: UI.accentSoft,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: sp(6),
  },

  headerButton: {
    width: sp(38),
    height: sp(38),
    borderRadius: sp(19),
    backgroundColor: UI.glass,
    alignItems: "center",
    justifyContent: "center",
    marginRight: sp(10),
  },

  logoBadge: {
    width: sp(38),
    height: sp(38),
    borderRadius: sp(19),
    backgroundColor: UI.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: sp(14),
    marginRight: sp(6),
  },
});
