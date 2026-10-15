import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { playASongs } from "./player";
import { handleLiked } from "./liked";
import { Alert, NativeModules } from "react-native";
import { showToast } from "./utils";

const MAX_RECENTS = 50;

// Songs come from different sources (API results use `videoId`, TrackPlayer
// tracks use `id`), so every comparison goes through one helper.
const songKey = (song) => song?.videoId || song?.id;

// Serialises read-modify-write access to "recents" so two quick calls
// (e.g. track change + play) can't overwrite each other's update.
let recentsLock = Promise.resolve();
const runExclusive = (task) => {
  const result = recentsLock.then(task, task);
  recentsLock = result.catch(() => { });
  return result;
};

const readList = async (storageKey) => {
  const raw = await AsyncStorage.getItem(storageKey);
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
};

/* ------------------------------ Recents ------------------------------ */

// Newest song is stored last.
export const saveToRecentlyPlayed = (song) =>
  runExclusive(async () => {
    try {
      const key = songKey(song);
      if (!key) return;

      const list = await readList("recents");
      const next = list.filter((item) => songKey(item) !== key);
      next.push(song);

      await AsyncStorage.setItem(
        "recents",
        JSON.stringify(next.slice(-MAX_RECENTS))
      );
    } catch (error) {
      console.log(error);
    }
  });

// Returns the 20 most recent songs, newest first.
export const getRecentlyPlayed = async (setIsLoading, setSongs) => {
  try {
    setIsLoading(true);
    const list = await readList("recents");
    setSongs(list.slice(-20).reverse());
    setIsLoading(false);
  } catch (error) {
    console.log(error);
    setIsLoading(false);
  }
};

export const mergeRecents = (remoteRecents) =>
  runExclusive(async () => {
    try {
      const localRecents = await readList("recents");
      const validRemoteRecents = Array.isArray(remoteRecents)
        ? remoteRecents
        : [];

      // Dedupe by song key; a repeated song moves to the end (most recent).
      const merged = new Map();
      [...localRecents, ...validRemoteRecents].forEach((item) => {
        const key = songKey(item);
        if (!key) return;
        merged.delete(key);
        merged.set(key, item);
      });

      const uniqueRecents = Array.from(merged.values()).slice(-MAX_RECENTS);
      await AsyncStorage.setItem("recents", JSON.stringify(uniqueRecents));

      console.log("Recents merged successfully:", uniqueRecents.length);
      return uniqueRecents;
    } catch (error) {
      console.error("Error merging recents:", error);
      return [];
    }
  });

/* ---------------------------- Favourites ----------------------------- */

export const saveToFavourites = async (favourites) => {
  try {
    await AsyncStorage.setItem("favourites", JSON.stringify(favourites));
  } catch (error) {
    console.log("Error saving favourites:", error);
  }
};

export const getFavourites = async () => {
  try {
    return await readList("favourites");
  } catch (error) {
    console.log("Error getting favourites:", error);
    return [];
  }
};

export const removeFromFavourites = async (song) => {
  let list = [];
  try {
    list = await getFavourites();
    const key = songKey(song);
    const next = list.filter((e) => songKey(e) !== key);

    if (next.length !== list.length) {
      await AsyncStorage.setItem("favourites", JSON.stringify(next));
      console.log("Updated favourites: ", next);
    }

    return next;
  } catch (error) {
    console.log("Error removing from favourites:", error);
    return list;
  }
};

export const checkIfLoggedIn = async () => {
  try {
    const storedUser = await AsyncStorage.getItem("userInfo");
    return Boolean(storedUser);
  } catch (error) {
    console.error("Error Fetching user:", error);
    return false;
  }
};

/* ----------------------------- Downloads ----------------------------- */

// Song titles can contain characters that are illegal in file names.
const sanitizeFileName = (name) =>
  String(name || "")
    .replace(/[\\/:*?"<>|#%]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export const downloadAndSaveSong = async (
  song,
  setProgress,
  setCurrentDownload
) => {
  const id = song?.videoId || song?.id;
  let fileUri = null;

  try {
    setCurrentDownload(song);

    // Ask for permission first, so we don't fetch a URL we can't use.
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Permission required to save songs offline."
      );
      return null;
    }

    const songUrl = await playASongs(id);
    if (!songUrl) {
      showToast("Couldn't get this song's download link", 3000);
      return null;
    }

    console.log("Downloading Song...", song?.title);

    // documentDirectory is kept by the OS; cacheDirectory can be wiped at any
    // time, which would break offline playback of "downloaded" songs.
    fileUri = `${FileSystem.documentDirectory}${sanitizeFileName(song?.title) || id
      }.mp3`;

    const downloadResumable = FileSystem.createDownloadResumable(
      songUrl,
      fileUri,
      {},
      (downloadProgress) => {
        // Total size can be unknown (0 or -1) for chunked responses.
        if (downloadProgress.totalBytesExpectedToWrite > 0) {
          setProgress(
            Math.round(
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
              100
            )
          );
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || (result.status && result.status >= 400)) {
      throw new Error(`Download failed with status ${result?.status}`);
    }
    const { uri } = result;
    console.log("Downloaded to:", uri);

    await MediaLibrary.saveToLibraryAsync(uri);

    const existingSongs = await readList("downloadedSongs");
    const newSong = {
      title: song.title,
      author: song.artist || song.author,
      thumbnail: song.thumbnail || song.artwork,
      uri: uri,
      id: id,
    };
    // Replace an earlier entry for the same song instead of duplicating it.
    const newSongs = [...existingSongs.filter((s) => s.id !== id), newSong];

    await AsyncStorage.setItem("downloadedSongs", JSON.stringify(newSongs));
    console.log("Song Downloaded and Saved");
    return uri;
  } catch (error) {
    console.error("Download error:", error);
    if (fileUri) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(
        () => { }
      );
    }
    return null;
  } finally {
    // Always reset, so the UI never stays stuck in a "downloading" state.
    setProgress(0);
    setCurrentDownload(null);
  }
};

// Returns an array of {title, author, thumbnail, uri, id}.
// Entries whose file no longer exists on the device are dropped.
export const getDownloadedSongs = async () => {
  try {
    const songs = await readList("downloadedSongs");

    const exists = await Promise.all(
      songs.map(async (s) => {
        try {
          const info = await FileSystem.getInfoAsync(s.uri);
          return info.exists;
        } catch {
          return true; // can't tell, so keep it
        }
      })
    );

    const valid = songs.filter((_, i) => exists[i]);
    if (valid.length !== songs.length) {
      await AsyncStorage.setItem("downloadedSongs", JSON.stringify(valid));
    }
    return valid;
  } catch (error) {
    console.error("Error retrieving songs:", error);
    return [];
  }
};

export const checkIfDownloaded = async (id) => {
  try {
    const songs = await getDownloadedSongs();
    return songs.some((s) => s.id === id);
  } catch (error) {
    console.log(error);
    return false;
  }
};

/* ------------------------------- Likes ------------------------------- */

let likeInFlight = false;

export const handleLike = async (userInfo, setFavorites, currentSong) => {
  if (!userInfo) {
    Alert.alert("Error!", "Please Sign In To Add Tracks to Favourites");
    return;
  }

  // Ignore taps while a like/unlike request is still running; two overlapping
  // requests would toggle the song twice.
  if (likeInFlight) return;
  likeInFlight = true;

  try {
    const key = songKey(currentSong);
    const currentFavourites = await getFavourites();
    const wasLiked = currentFavourites.some((item) => songKey(item) === key);

    // Immediate feedback while the request runs
    showToast(
      wasLiked ? "Removing from Favourites..." : "Adding to Favourites...",
      3000
    );

    // Toggle on the server, which returns the full updated list
    const data = await handleLiked(userInfo.email, currentSong);

    if (Array.isArray(data?.favourites)) {
      await saveToFavourites(data.favourites);
      setFavorites(data.favourites);

      // Report what the server actually did, not what we expected
      const isLikedNow = data.favourites.some(
        (item) => songKey(item) === key
      );
      showToast(
        isLikedNow ? "Added to Favourites" : "Removed from Favourites",
        3000
      );
    } else {
      throw new Error("Invalid server response");
    }
  } catch (error) {
    console.error("Error handling like:", error);
    showToast("Error updating favourites", 3000);
  } finally {
    likeInFlight = false;
  }
};

/* ----------------------------- Metadata ------------------------------ */

const { AudioMetadata } = NativeModules;

export const getMetadata = async (uri) => {
  if (!AudioMetadata?.getAudioMetadata) {
    throw new Error("AudioMetadata native module is not available");
  }
  try {
    const metadata = await AudioMetadata.getAudioMetadata(uri);
    return metadata;
  } catch (error) {
    console.error("Error fetching metadata", error);
    throw error;
  }
};