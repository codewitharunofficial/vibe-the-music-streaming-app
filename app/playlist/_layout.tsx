import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native";
import { ModalPortal } from "react-native-modals";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { MiniPlayer, NowPlayingScreen } from "@/components/Component";
import { useColorScheme } from "@/components/useColorScheme";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";

export default function RootLayoutNav() {
  const {
    songUrl,
    setSongUrl,
    isSongLoading,
    setIsSongLoading,
    currentSong,
    setCurrentSong,
    open,
    setOpen,
  } = useSong();
  const { isPlaying, setIsPlaying } = useSong();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack screenOptions={{headerStyle: {backgroundColor: '#054465'}, headerTitleStyle: {color: '#fff'}}} >
        <Stack.Screen name="index" options={{ headerTitle: "Playlist" }} />
      </Stack>
    </SafeAreaView>
  );
}
