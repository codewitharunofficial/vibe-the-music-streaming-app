import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";

export default function RootLayoutNav() {
  useSong();
  const { isPlaying, setIsPlaying } = useSong();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack screenOptions={{headerStyle: {backgroundColor: '#054465'}, statusBarColor: "transparent",}} >
        <Stack.Screen name="index" options={{ headerTitle: "Recent Played", headerTintColor: "#fff" }} />
      </Stack>
    </SafeAreaView>
  );
}
