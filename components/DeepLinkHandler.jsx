import { useEffect } from "react";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TrackPlayer from "react-native-track-player";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { saveToRecentlyPlayed } from "@/constants/cachedData";
import { handleRecentlyPlayed } from "@/constants/apiCalls";

let lastHandledUrl = null;

export default function DeepLinkHandler({ ready }) {
  const { setIsSongLoading, setCurrentSong, setOpen } = useSong();
  const { setPlayingFrom } = usePlayer();

  useEffect(() => {
    if (!ready) return;

    const handleDeepLink = async (url) => {
      if (!url || url === lastHandledUrl) return;
      const { queryParams } = Linking.parse(url);
      if (!queryParams?.id) return;
      lastHandledUrl = url;

      setIsSongLoading(true);
      setPlayingFrom("Share");
      try {
        const user = JSON.parse((await AsyncStorage.getItem("userInfo")) || "null");
        const song = {
          videoId: queryParams.id,
          title: queryParams.title,
          author: queryParams.author,
          thumbnail: queryParams.thumbnail,
        };

        await saveToRecentlyPlayed(song);
        if (user) await handleRecentlyPlayed(user.email, song);
        setCurrentSong(song);

        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: song.videoId,
          url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${song.videoId}&email=${user?.email || ""}`,
          title: song.title,
          artist: song.author,
          artwork: song.thumbnail,
        });
        await TrackPlayer.play();
        setOpen(true);
      } catch (e) {
        console.error("Deep link playback failed:", e);
      } finally {
        setIsSongLoading(false);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);                      // cold start
    const sub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url)); // warm
    return () => sub.remove();
  }, [ready]);

  return null;
}