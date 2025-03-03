import { playASongs } from "./apiCalls";
import { saveToRecentlyPlayed } from "./cachedData";

export const playSong = async (
  song,
  setIsSongLoading,
  setCurrentSong,
  setSongUrl
) => {
  await saveToRecentlyPlayed(song);
  setIsSongLoading(true);
  setCurrentSong(song);
  const url = await playASongs(song?.videoId);
  if (url) {
    setSongUrl(url);
    setIsSongLoading(false);
  }
};
