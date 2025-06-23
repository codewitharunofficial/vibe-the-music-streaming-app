import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { playASongs } from "./player";
import { handleLiked } from "./liked";
import { ToastAndroid } from "react-native";
import { NativeModules } from 'react-native';


export const saveToRecentlyPlayed = async (song) => {
  console.log(song);
  try {
    const list = JSON.parse(await AsyncStorage.getItem("recents")) || [];
    const ifExist = list.find((item) => item.videoId === song?.videoId);
    if (!ifExist) {
      list.push(song);
      await AsyncStorage.setItem("recents", JSON.stringify(list));
    } else {
      const itemIndex = list.findIndex(
        (item) => item.videoId === song?.videoId
      );
      list.splice(itemIndex, 1);
      list.push(song);
      await AsyncStorage.setItem("recents", JSON.stringify(list));
    }
  } catch (error) {
    console.log(error);
  }
};

export const getRecentlyPlayed = async (setIsLoading, setSongs) => {
  try {
    setIsLoading(true);
    const list = JSON.parse(await AsyncStorage.getItem("recents")) || [];
    setSongs(list.slice(0, 20));
    setIsLoading(false);
  } catch (error) {
    console.log(error);
    setIsLoading(false);
  }
};


export const mergeRecents = async (remoteRecents) => {
  try {
    console.log("Remote Recents: ", remoteRecents);

    const localData = await AsyncStorage.getItem('recents');
    const localRecents = localData ? JSON.parse(localData) : [];

    const validRemoteRecents = Array.isArray(remoteRecents) ? remoteRecents : [];

    // Merge and remove duplicates efficiently using Map
    const mergedRecents = [...localRecents, ...validRemoteRecents];
    const uniqueRecents = Array.from(new Map(mergedRecents.map(item => [item.id, item])).values());

    await AsyncStorage.setItem('recents', JSON.stringify(uniqueRecents));

    console.log('Recents merged successfully', uniqueRecents);
    return uniqueRecents;

  } catch (error) {
    console.error('Error merging recents:', error);
    return [];
  }
};

export const saveToFavourites = async (favourites) => {
  try {
    await AsyncStorage.setItem("favourites", JSON.stringify(favourites));
  } catch (error) {
    console.log("Error saving favourites:", error);
  }
};

export const getFavourites = async () => {
  try {
    const raw = await AsyncStorage.getItem("favourites");
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.log("Error getting favourites:", error);
    return [];
  }
};


export const removeFromFavourites = async (song) => {
  try {
    const list = JSON.parse(await AsyncStorage.getItem('favourites')) || [];

    if (list.length > 0) {
      const itemIndex = list.findIndex(e => e.videoId === song.videoId);

      if (itemIndex !== -1) {

        list.splice(itemIndex, 1);

        await AsyncStorage.setItem('favourites', JSON.stringify(list));
        console.log("Updated favourites: ", list);
      }
    }

    return list;

  } catch (error) {
    console.log("Error removing from favourites:", error);
  }
};

export const checkIfLoggedIn = async () => {
  try {
    const storedUser = await AsyncStorage.getItem("userInfo");
    if (storedUser) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error Fetching user:", error);
  }
};


export const downloadAndSaveSong = async (song, setProgress, setCurrentDownload) => {
  try {

    const songUrl = await playASongs(song?.videoId || song?.id);

    console.log("Downloading Song...", song);

    setCurrentDownload(song);

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission required to save songs offline.');
      return null;
    }

    // Define file path
    const fileUri = `${FileSystem.cacheDirectory}${song.title}.mp3`;

    if (songUrl) {

      const downloadResumable = FileSystem.createDownloadResumable(songUrl, fileUri, {},
        (downloadProgress) => {
          const progressPercentage = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          );
          setProgress(progressPercentage);
        });
      const { uri } = await downloadResumable.downloadAsync();
      console.log("Downloaded to:", uri);


      await MediaLibrary.saveToLibraryAsync(uri);


      const existingSongs = JSON.parse(await AsyncStorage.getItem('downloadedSongs')) || [];
      const newSong = { title: song.title, author: song.artist || song.author, thumbnail: song.thumbnail || song.artwork, uri: uri, id: song.videoId || song.id };
      const newSongs = [...existingSongs, newSong];

      await AsyncStorage.setItem('downloadedSongs', JSON.stringify(newSongs));
      console.log("Song Downloaded and Saved");
      setProgress(0);
      setCurrentDownload(null);
      return uri;
    }

  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
};

export const getDownloadedSongs = async () => {
  try {
    const songs = JSON.parse(await AsyncStorage.getItem('downloadedSongs')) || [];
    return songs; // Returns an array of {title, author, thumbnail, uri}
  } catch (error) {
    console.error('Error retrieving songs:', error);
    return [];
  }
};


export const checkIfDownloaded = async (id) => {
  try {

    console.log("Checking Song With: ", id);

    const songs = await getDownloadedSongs();

    console.log("All Downloaded Songs: ", songs);

    if (songs?.length > 0) {
      const isDownloaded = songs.find((s) => s.id === id);
      console.log("Found Song: ", isDownloaded);
      if (isDownloaded) {
        return true
      } else return false
    } else {
      return false
    }
  } catch (error) {
    console.log(error);
  }
}


export const handleLike = async (userInfo, setFavorites, currentSong) => {
  if (!userInfo) {
    Alert.alert("Error!", "Please Sign In To Add Tracks to Favourites");
    return;
  }

  try {
    const currentFavourites = (await getFavourites()) || [];
    const isLiked = currentFavourites.some((item) => item.videoId === currentSong.videoId);

    ToastAndroid.show(
      isLiked ? "Removing from Favourites..." : "Adding to Favourites...",
      ToastAndroid.SHORT
    );

    const data = await handleLiked(userInfo.email, currentSong); // server handles toggle logic
    if (data?.favourites) {
      await saveToFavourites(data.favourites);
      setFavorites(data.favourites);

      ToastAndroid.show(
        isLiked ? "Removed from Favourites" : "Added to Favourites",
        ToastAndroid.SHORT
      );
    } else {
      throw new Error("Invalid server response");
    }
  } catch (error) {
    console.error("Error handling like:", error);
    ToastAndroid.show("Error updating favourites", ToastAndroid.SHORT);
  }
};




const { AudioMetadata } = NativeModules;

export const getMetadata = async (uri) => {
  try {
    const metadata = await AudioMetadata.getAudioMetadata(uri);
    return metadata;
  } catch (error) {
    console.error("Error fetching metadata", error);
    throw error;
  }
};
