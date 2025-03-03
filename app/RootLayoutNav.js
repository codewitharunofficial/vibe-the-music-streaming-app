import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native";
import { ModalPortal } from "react-native-modals";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { MiniPlayer, NowPlayingScreen } from "@/components/Component";
import { useColorScheme } from "@/components/useColorScheme";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

export default function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { songUrl, setSongUrl, isSongLoading, setIsSongLoading, currentSong, setCurrentSong, open, setOpen } = useSong();
  const { isPlaying, setIsPlaying } = useSong();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="recents" options={{ headerShown: false }} />
          <Stack.Screen name="trendings" options={{ headerShown: false }} />
          <Stack.Screen name="playlist" options={{ headerShown: false }} />
        </Stack>
        <ModalPortal />

        {/* Mini Player */}
        {currentSong && !open ? (
          <MiniPlayer
            song={currentSong}
            onOpen={setOpen}
            isSongLoading={isSongLoading}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        ) : null}

        {/* Now Playing Screen */}
        <NowPlayingScreen
          song={currentSong}
          isVisible={open}
          setIsVisible={setOpen}
          isSongLoading={isSongLoading}
          url={songUrl}
        />
      </ThemeProvider>
    </SafeAreaView>
  );
}
