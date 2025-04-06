import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { mergeRecents } from "./cachedData";

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
    if (data.results) {
      await AsyncStorage.setItem("home", JSON.stringify(data.results));
      const now = new Date().getTime();
      const expiry = now + 24 * 60 * 60 * 1000;
      await AsyncStorage.setItem('home_updated_at', JSON.stringify(expiry));
      setIsLoading(false);
      return data.results;
    }
  } catch (error) {
    console.error(error);
    setIsLoading(false);
  }
};

// export const playASongs = async (id, email, song) => {
//   try {
//     console.log("Getting song with ID: ", id);

//     const { data } = await axios.post(
//       `${process.env.EXPO_PUBLIC_API}/api/song`, { id: id }
//     );
//     if (data) {
//       console.log(data);
//       return data.song.adaptiveFormats[data.song.adaptiveFormats?.length - 1]
//         ?.url;
//     }
//   } catch (error) {
//     console.error(error);
//   }
// };

export const getTrendings = async () => {
  const options = {
    method: "GET",
    url: "https://yt-api.p.rapidapi.com/trending",
    params: { geo: "IN", type: "music" },
    headers: {
      "x-rapidapi-key": process.env.EXPO_PUBLIC_API_KEY_1,
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
    url: "https://youtube-music-api3.p.rapidapi.com/getAlbum",
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
    await AsyncStorage.setItem(`album_${id}`, JSON.stringify(data));
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
  }
};

export const handleLiked = async (email, song) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/favourites`,
      { email: email, song: song }
    );
    if (data.success) {
      console.log(data);
      return data;
    } else {
      console.log(data.message);
    }
  } catch (error) {
    console.log(error);
  }
};

export const handleRecentlyPlayed = async (email, song) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/recently-played`,
      { email: email, song: song }
    );
    if (data.success) {
      console.log(data);
      // return data;
    } else {
      console.log(data.message);
    }
  } catch (error) {
    console.log(error);
  }
};

export const retrieveRecentlyPlayed = async (email) => {
  try {
    const { data } = await axios.get(
      `${process.env.EXPO_PUBLIC_API}/api/get-recents?email=${email}`
    );
    if (data.success) {
      await mergeRecents(data.recently_played)
    }
  } catch (error) {
    console.log(error);
  }
};

export const fetchUserPlaylists = async (email, setPlaylists) => {
  try {
    const { data } = await axios.get(
      `${process.env.EXPO_PUBLIC_API}/api/playlists?email=${email}`
    );
    if (data.success) {
      console.log(data);
      setPlaylists(data.playlists);
      // return data.playlists;
    }
  } catch (error) {
    console.log(error);
  }
};

export const createNewPlaylist = async (email, name, setPlaylists) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/playlist/create`,
      { playlistName: name, email: email }
    );
    if (data.success) {
      console.log(data);
      setPlaylists(data.playlists);
      // return data.playlists;
    }
  } catch (error) {
    console.log(error);
  }
};

export const handleAddToPlaylist = async (email, name, song) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/playlist/add-song`,
      { playlistName: name, email: email, song: song }
    );
    if (data.success) {
      console.log(data);
    }
  } catch (error) {
    console.log(error);
  }
};
