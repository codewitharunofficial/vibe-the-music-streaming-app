import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const fetchHome = async (setIsLoading) => {
  const options = {
    method: "GET",
    url: "https://youtube-music-api3.p.rapidapi.com/v2/home",
    params: { gl: "IN" },
    headers: {
      "x-rapidapi-key": `${process.env.EXPO_PUBLIC_API_KEY_1}`,
      "x-rapidapi-host": `${process.env.EXPO_PUBLIC_API_HOST_1}`,
    },
  };

  try {
    setIsLoading(true);
    const { data } = await axios.request(options);
    console.log(data);
    await AsyncStorage.setItem("home", JSON.stringify(data.results));
    setIsLoading(false);
    return data.results;
  } catch (error) {
    console.error(error);
    setIsLoading(false);
  }
};

export const playASongs = async (id) => {
  try {
    console.log("Getting song with ID: ", id);

    const { data } = await axios.get(
      `https://vibe-music-eight.vercel.app/api/song?id=${id}`
    );
    if (data) {
      console.log(data);
      return data.song.adaptiveFormats[data.song.adaptiveFormats?.length - 1]
        ?.url;
    }
  } catch (error) {
    console.error(error);
  }
};

export const getTrendings = async () => {
  const options = {
    method: "GET",
    url: "https://yt-api.p.rapidapi.com/trending",
    params: { geo: "IN", type: "music" },
    headers: {
      "x-rapidapi-key": "b1c26628e0msh3fbbf13ea24b4abp184561jsna2ebae86e910",
      "x-rapidapi-host": "yt-api.p.rapidapi.com",
    },
  };
  try {
    const { data } = await axios.request(options);
    console.log(data.data);
    await AsyncStorage.setItem("trendings", JSON.stringify(data.data));
    return data.data;
  } catch (error) {
    console.error(error);
  }
};

export const getPlaylistSongs = async (id) => {
  const results =
    JSON.parse(await AsyncStorage.getItem(`playlist_${id}`)) || [];

  if (results?.length > 0) {
    return results;
  } else {
    const options = {
      method: "GET",
      url: "https://youtube-music-api3.p.rapidapi.com/getPlaylist",
      params: {
        id: id,
      },
      headers: {
        "x-rapidapi-key": process.env.EXPO_PUBLIC_API_KEY_1,
        "x-rapidapi-host": "youtube-music-api3.p.rapidapi.com",
      },
    };

    try {
      const { data } = await axios.request(options);
      // console.log(data);
      await AsyncStorage.setItem(`playlist_${id}`, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error(error);
    }
  }
};

export const getAlbumSongs = async (id) => {
  const options = {
    method: "GET",
    url: "https://youtube-music-api-yt.p.rapidapi.com/get-album",
    params: {
      videoId: id,
    },
    headers: {
      "x-rapidapi-key": process.env.EXPO_PUBLIC_API_KEY_1,
      "x-rapidapi-host": "youtube-music-api-yt.p.rapidapi.com",
    },
  };

  try {
    const { data } = await axios.request(options);
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
  }
};
