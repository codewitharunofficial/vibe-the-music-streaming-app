import axios from "axios";
import { Share } from "react-native";

export const playASongs = async (id, email, song) => {
  try {
    console.log("Getting song with ID: ", id);

    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/song`, { id: id }
    );
    if (data) {
      console.log(data.song.adaptiveFormats[data.song.adaptiveFormats?.length - 1]
        ?.url);
      return data.song.adaptiveFormats[data.song.adaptiveFormats?.length - 1]
        ?.url;
    }
  } catch (error) {
    console.error(error);
  }
};

export const shareSong = async (currentSong) => {
  const songId = currentSong?.videoId || currentSong?.id;
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



