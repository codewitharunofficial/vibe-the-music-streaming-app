import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native";

export default function RootLayoutNav() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ headerTitle: "Album" }} />
      </Stack>
    </SafeAreaView>
  );
}
