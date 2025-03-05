import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native";
import { ModalPortal } from "react-native-modals";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { MiniPlayer, NowPlayingScreen } from "@/components/Component";
import { useColorScheme } from "@/components/useColorScheme";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import TrackPlayer from 'react-native-track-player';

export default function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { songUrl, setSongUrl, isSongLoading, setIsSongLoading, currentSong, setCurrentSong, open, setOpen } = useSong();
  const { isPlaying, setIsPlaying } = useSong();

  useEffect(() => {
    const setupTrackPlayer = async () => {
      try {
        // Register the playback service
        TrackPlayer.registerPlaybackService(() => require('@/trackPlayerService'));

        // Optional: Initialize TrackPlayer here if needed
        const isInitialized = await TrackPlayer.isServiceRunning();
        if (!isInitialized) {
          await TrackPlayer.setupPlayer();
          console.log("TrackPlayer setup complete in RootLayout");
        }
      } catch (error) {
        console.error("Error setting up TrackPlayer in RootLayout:", error);
      }
    };

    setupTrackPlayer();

    return () => {
      // Cleanup if needed
      TrackPlayer.reset();
    };
  }, []);

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
