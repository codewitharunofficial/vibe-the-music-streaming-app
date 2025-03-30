import React, { useEffect, useState } from "react";
import { router, Stack, useSegments } from "expo-router";
import {
  Alert,
  Linking,
  SafeAreaView,
  ActivityIndicator,
  View,
  Text,
} from "react-native";
import { ModalPortal } from "react-native-modals";
import * as Updates from "expo-updates";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import {
  MiniPlayer,
  MiniPlayerProgress,
  NowPlayingScreen,
} from "@/components/Component";
import { useColorScheme } from "@/components/useColorScheme";
import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import TrackPlayer, { Capability, RepeatMode, AppKilledPlaybackBehavior } from "react-native-track-player";
import { trackPlayerService } from "@/trackPlayerService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@/context/User";
import { saveToFavourites } from "@/constants/cachedData";

export default function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const {
    songUrl,
    setSongUrl,
    isSongLoading,
    setIsSongLoading,
    currentSong,
    setCurrentSong,
    open,
    setOpen,
    currentQueue,
  } = useSong();
  const { isPlaying, setIsPlaying } = useSong();
  const { playlistName } = useUser();

  const route = useSegments();
  const { userInfo, setUserInfo } = useUser();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(true);

  // ✅ Function to check for updates
  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          "Update Available",
          "A new version is available. Do you want to update now?",
          [
            {
              text: "Later",
              style: "cancel",
            },
            {
              text: "Update Now",
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (error) {
                  Alert.alert("Update Error", "Failed to update the app.");
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };


  useEffect(() => {
    checkForUpdates();
  }, []);



  const setupTrackPlayer = async () => {
    try {
      console.log("Setting up TrackPlayer...");
      await TrackPlayer.setupPlayer();
      console.log("TrackPlayer setup complete");

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        stopWithApp: true,
        android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback },
        waitForBuffer: true
      });
      console.log("TrackPlayer options updated");

      await TrackPlayer.setRepeatMode(RepeatMode.Off);
      console.log("Repeat mode set to Off");

      const track = await TrackPlayer.getActiveTrack();
      if (track) {
        console.log("Active Track: ", track);
        setCurrentSong(track);
        setOpen(true);
      }
    } catch (error) {
      console.error("Error setting up TrackPlayer:", error);
    }
  };

  const registerPlaybackService = async () => {
    try {
      console.log("Attempting to register playback service...");
      TrackPlayer.registerPlaybackService(() => trackPlayerService);
      console.log("Playback service registered successfully");
    } catch (error) {
      console.error("Error registering playback service:", error);
    }
  };

  useEffect(() => {
    const setup = async () => {
      await registerPlaybackService();
      await setupTrackPlayer();
    };
    setup();

    return () => {
      TrackPlayer.destroy().catch((err) =>
        console.error("Error destroying TrackPlayer:", err)
      );
    };
  }, []);

  useEffect(() => {
    const loadUserSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userInfo");
        if (storedUser) {
          setUserInfo(JSON.parse(storedUser));
          await saveToFavourites(JSON.parse(storedUser)?.favourites || []);
          await AsyncStorage.setItem(
            "recents",
            JSON.stringify(JSON.parse(storedUser)?.recently_played)
          );
        }
      } catch (error) {
        console.error("Error loading user session:", error);
      }
    };
    loadUserSession();
  }, []);

  if (isCheckingUpdate) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Checking for updates...</Text>
      </View>
    );
  }

  const headerColor = "#fff";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recents" options={{ headerShown: false }} />
          <Stack.Screen name="trendings" options={{ headerShown: false }} />
          <Stack.Screen name="playlist" options={{ headerShown: false }} />
          <Stack.Screen name="album" options={{ headerShown: false }} />
          <Stack.Screen
            name="favourites"
            options={{ headerShown: true, headerTitle: "Favourite Songs", headerTitleStyle: { color: headerColor } }}
          />
          <Stack.Screen
            name="soon"
            options={{ headerShown: true, headerTitle: "Not Available", headerTitleStyle: { color: headerColor } }}
          />
          <Stack.Screen
            name="playlists"
            options={{ headerShown: true, headerTitle: "My Playlists", headerTitleStyle: { color: headerColor } }}
          />
          <Stack.Screen
            name="user-playlist"
            options={{ headerShown: true, headerTitle: `${playlistName}`, headerTitleStyle: { color: headerColor } }}
          />
        </Stack>
        <ModalPortal />

        {/* Mini Player */}
        {currentSong && !open && route[0] === "(tabs)" ? (
          <MiniPlayer
            song={currentSong}
            onOpen={setOpen}
            isSongLoading={isSongLoading}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            route={route[0]}
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

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "white",
  },
};
