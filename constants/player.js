import { Share } from "react-native";
import { playASongs } from "./apiCalls";
import { saveToRecentlyPlayed } from "./cachedData";

export const playSong = async (
  song,
  setIsSongLoading,
  setCurrentSong,
  setSongUrl,
  email
) => {
  await saveToRecentlyPlayed(song);
  setIsSongLoading(true);
  setCurrentSong(song);
  const url = await playASongs(song?.videoId, email, song);
  if (url) {
    setSongUrl(url);
    setIsSongLoading(false);
  }
};

export const shareSong = async (currentSong) => {
  const songId = currentSong?.videoId;
  if (!songId) return;

  const deepLink = `${process.env.EXPO_PUBLIC_API}/api/listen?id=${songId}`;

  try {
    await Share.share({
      message: `🎶 Listen to "${currentSong?.title}" on Vibe! \n ${deepLink}`,
    });
  } catch (error) {
    console.error("Error sharing song:", error);
  }
};
