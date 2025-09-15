import React, { useEffect } from "react";
import { Stack, useSegments } from "expo-router";
import {
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { ModalPortal } from "react-native-modals";
import { useSong } from "@/context/SongContext";
import {
  MiniPlayer,
  NowPlayingScreen,
} from "@/components/Component";
import { useColorScheme } from "@/components/useColorScheme";
import {
  ThemeProvider,
  DarkTheme,
} from "@react-navigation/native";
import TrackPlayer, { Capability, RepeatMode, AppKilledPlaybackBehavior } from "react-native-track-player";
import { trackPlayerService } from "@/trackPlayerService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@/context/User";
import { saveToFavourites } from "@/constants/cachedData";
import { addToRNTPQueue, moveSong } from "@/constants/queue";
import { EvilIcons } from "@expo/vector-icons";
import { fetchUserPlaylists } from "@/constants/apiCalls";
import TrackOptionModal from "@/components/TrackOptions";

export default function RootLayoutNav() {
  const {
    songUrl,
    isSongLoading,
    currentSong,
    setCurrentSong,
    open,
    setOpen,
  } = useSong();
  const { isPlaying, setIsPlaying, isModalOpen, setIsModalOpen, selectedTrack } = useSong();
  const { playlistName, setUserPlaylist } = useUser();

  const route = useSegments();
  const { userInfo, setUserInfo } = useUser();



  const getUserInfo = async () => {
    const user = JSON.parse(await AsyncStorage.getItem("userInfo"));
    if (user) {
      setUserInfo(user);
    } else {
      console.log("No LoggedIn User Found");
    }
  };

  useEffect(() => {
    getUserInfo();
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
        android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification },
        waitForBuffer: true
      });
      console.log("TrackPlayer options updated");

      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      console.log("Repeat mode set to Queue");

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

  const headerColor = "#fff";



  //Refresh-User-Playlists

  const handleRefresh = async () => {
    try {
      const playlists = JSON.parse(await AsyncStorage.getItem('user-playlists')) || [];

      if (playlists?.length > 0) {
        await AsyncStorage.removeItem('user-playlists');
        await fetchUserPlaylists(userInfo._id, setUserPlaylist);
      }
    } catch (error) {
      console.log(error);
    }
  }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recents" options={{ headerShown: false }} />

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
            options={{
              headerShown: true, headerTitle: "My Playlists", headerTitleStyle: { color: headerColor }, headerRight: () => <TouchableOpacity onPress={() => handleRefresh()} >
                <EvilIcons name="refresh" size={30} color={'white'} />
              </TouchableOpacity>
            }}

          />
          <Stack.Screen
            name="user-playlist"
            options={{ headerShown: true, headerTitle: `${playlistName}`, headerTitleStyle: { color: headerColor } }}
          />
          <Stack.Screen
            name="updates"
            options={{ headerShown: true, headerTitle: `App-Update`, headerTitleStyle: { color: headerColor } }}
          />
          <Stack.Screen
            name="downloaded"
            options={{ headerShown: true, headerTitle: `Downloaded`, headerTitleStyle: { color: headerColor } }}
          />
          <Stack.Screen
            name="local"
            options={{ headerShown: true, headerTitle: `Local-Songs`, headerTitleStyle: { color: headerColor } }}
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

        <NowPlayingScreen
          song={currentSong}
          isVisible={open}
          setIsVisible={setOpen}
          isSongLoading={isSongLoading}
          url={songUrl}
        />

        <TrackOptionModal
          isVisible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          song={selectedTrack}
          moveSong={moveSong}
          handleQueueSong={() => addToRNTPQueue(selectedTrack)}
        />
      </ThemeProvider>
    </SafeAreaView>
  );
}


