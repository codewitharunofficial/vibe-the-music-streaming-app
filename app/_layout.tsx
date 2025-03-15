import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { SongProvider } from "@/context/SongContext";
import { PlayerProvider } from "@/context/PlayerContext";
import RootLayoutNav from "./RootLayoutNav"; // Move navigation logic to a separate file
import { PlaylistProvider } from "@/context/Playlist";
import { TrackPlayerServiceProvider } from "@/context/TrackPlayerConext";
import { UserProvider } from "@/context/User";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function prepare() {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds
      setIsAppReady(true);
    }

    prepare();
  }, []);

  useEffect(() => {
    if (loaded && isAppReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAppReady]);

  // Block rendering until fonts are loaded AND timeout is complete
  if (!loaded || !isAppReady) {
    return null;
  }

  return (
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
  );
}
