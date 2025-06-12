import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { mergeRecents } from "./cachedData";

export const fetchHome = async (setIsLoading, email) => {
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
    if (data.results && email) {
      const customPlaylists = await getCustomPlaylists(email);
      const results = { ...data.results, "custom_playlists": customPlaylists };
      await AsyncStorage.setItem("home", JSON.stringify(results));
      const now = new Date().getTime();
      const expiry = now + 24 * 60 * 60 * 1000;
      await AsyncStorage.setItem('home_updated_at', JSON.stringify(expiry));
      setIsLoading(false);
      return results;
    } else if (!data.results) {
      console.log(
        "Unable To Laod Home Content"
      );
    } else if (!email) {
      console.log(
        "You're not Authorized to get the custom playlists, please login"
      );
    }
  } catch (error) {
    console.error(error);
    setIsLoading(false);
  }
};

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

export const fetchUserPlaylists = async (userId, setPlaylists) => {
  try {
    const { data } = await axios.get(
      `${process.env.EXPO_PUBLIC_API}/api/playlists?id=${userId}`
    );
    if (data.success) {
      console.log(data);
      setPlaylists(data.playlists);
      await AsyncStorage.setItem('user-playlists', JSON.stringify(data.playlists));
    }
  } catch (error) {
    console.log(error);
  }
};

export const createNewPlaylist = async (id, name) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/playlist/create`,
      { playlistName: name, id: id }
    );
    if (data.success) {

      return data.playlists;
    }
  } catch (error) {
    console.log(error);
  }
};

export const handleAddToPlaylist = async (id, song) => {
  console.log(`${song} to be added to playlist with id: ${id}`);
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/playlist/add-song`,
      { id: id, song: song }
    );
    if (data.success) {
      console.log(data);
      const playlists = JSON.parse(await AsyncStorage.getItem("user-playlists")) || [];

      if (playlists.length > 0) {
        const updatedPlaylists = playlists.map((playlist) => {
          if (playlist._id === id) {
            return data.playlist;
          }
          return playlist;
        });
        await AsyncStorage.setItem("user-playlists", JSON.stringify(updatedPlaylists));
      }
    }
  } catch (error) {
    console.log(error);
  }
};


export const updateUserPlaylist = async (id, name, type) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API_2}/api/v2/update-playlist`,
      { id: id, name: name, type: type }
    );
    if (data.success) {
      console.log(data);
      return data.playlists;
    }
  } catch (error) {
    console.log(error);
  }
}

export const getCustomPlaylists = async (email) => {
  try {
    const { data } = await axios.get(`${process.env.EXPO_PUBLIC_API_2}/api/v2/get-custom-playlists?email=${email}`);
    if (data.success) {
      return data.playlists;
    }
  } catch (error) {
    console.log(error);
  }
}

export const reloadHome = async (setIsLoading, email) => {
  await AsyncStorage.multiRemove(['home', 'home_updated_at']);

  fetchHome(setIsLoading, email);
}
