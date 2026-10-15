import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";

import { SongProvider } from "@/context/SongContext";
import { PlayerProvider } from "@/context/PlayerContext";
import RootLayoutNav from "./RootLayoutNav"; // Move navigation logic to a separate file
import { PlaylistProvider } from "@/context/Playlist";
import { TrackPlayerServiceProvider } from "@/context/TrackPlayerConext";
import { UserProvider } from "@/context/User";
import AnimatedSplash, { SPLASH_BG } from "@/components/AnimatedSplash";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Keep the native splash up until the animated splash below has been drawn
// (AnimatedSplash hides it itself, so there is no blank flash in between).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Stays true until the animated splash has finished its exit animation
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
      {/* The app mounts as soon as fonts are ready, so it loads its data
          behind the splash while the animation plays. */}
      {loaded && (
        <UserProvider>
          <TrackPlayerServiceProvider>
            <PlaylistProvider>
              <PlayerProvider>
                <SongProvider>
                  <RootLayoutNav />
                </SongProvider>
              </PlayerProvider>
            </PlaylistProvider>
          </TrackPlayerServiceProvider>
        </UserProvider>
      )}

      {showSplash && (
        <AnimatedSplash ready={loaded} onFinish={() => setShowSplash(false)} />
      )}
    </View>
  );
}
