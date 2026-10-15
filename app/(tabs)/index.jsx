import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  StyleSheet,
  ToastAndroid,
} from "react-native";
import { View } from "@/components/Themed";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchHome,
  getAlbumSongs,
  getPlaylistSongs,
  handleRecentlyPlayed,
} from "@/constants/apiCalls";
import { MusicSections, QuickAccessButton } from "@/components/Component";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { router } from "expo-router";
import { saveToRecentlyPlayed } from "@/constants/cachedData";
import Loader from "@/components/Loader";
import { usePlaylist } from "@/context/Playlist";
import TrackPlayer from "react-native-track-player";
import { useUser } from "@/context/User";
import * as Linking from "expo-linking";
import { getItemType, ITEM_TYPES, withVideoId } from "@/constants/itemType";

const { width, height } = Dimensions.get("window");

/* ---------- THEME ---------- */
const COLORS = {
  background: "#121212",
  surface: "#1E1E1E",
  surfaceAlt: "#2A2A2A",
  primary: "#FF9F1C", // brand orange (loader)
  textPrimary: "#FFFFFF",
  textSecondary: "#CFCFCF",
  textMuted: "#9A9A9A",
  scrim: "rgba(4,24,35,0.55)", // dark wash over the background image
};

/* ---------- RESPONSIVE ---------- */
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const wp = (size) => (width / guidelineBaseWidth) * size;
const hp = (size) => (height / guidelineBaseHeight) * size;
const sp = (size) =>
  Math.round(
    size * Math.min(width / guidelineBaseWidth, height / guidelineBaseHeight),
  );

export default function Home() {
  const [home, setHome] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { open, setOpen, setIsSongLoading, setCurrentSong, currentSong } =
    useSong();
  const { setIsPlaying, setCurrentQueue, setPlayingFrom } = usePlayer();
  const { setPlaylist, setAlbum } = usePlaylist();
  const { userInfo } = useUser();
  const [background, setBackground] = useState(
    "../../../assets/images/icon.png",
  );

  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const [albumLoading, setIsAlbumLoading] = useState(false);

  const savedHome = async () => {
    const results = JSON.parse(await AsyncStorage.getItem("home"));
    if (results) {
      const isOutdated =
        new Date().getTime() >
        JSON.parse(await AsyncStorage.getItem("home_updated_at"));

      if (isOutdated) {
        const newResults = await fetchHome(setIsLoading, userInfo?.email || "");
        if (newResults) setHome(newResults);
      } else {
        setHome(results);
      }
    } else {
      const results = await fetchHome(setIsLoading, userInfo?.email || "");
      if (results) setHome(results);
    }
  };

  useEffect(() => {
    savedHome();
  }, []);

  /* ---------- DEEP LINK HANDLING (UNCHANGED) ---------- */
  // useEffect(() => {
  //   const handleDeepLink = async ({ url }) => {
  //     let { queryParams } = Linking.parse(url);
  //     if (queryParams?.id) {
  //       setIsSongLoading(true);
  //       setPlayingFrom("Share");
  //       try {
  //         const song = {
  //           videoId: queryParams.id,
  //           title: decodeURIComponent(queryParams.title),
  //           author: decodeURIComponent(queryParams.author),
  //           thumbnail: decodeURIComponent(queryParams.thumbnail),
  //         };

  //         await saveToRecentlyPlayed(song);
  //         if (userInfo) await handleRecentlyPlayed(userInfo.email, song);

  //         setCurrentSong(song);

  //         const track = {
  //           id: song.videoId,
  //           url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${song.videoId}&email=${userInfo?.email || ""}`,
  //           title: song.title,
  //           artist: song.author,
  //           artwork: song.thumbnail,
  //         };

  //         await TrackPlayer.reset();
  //         await TrackPlayer.add(track);
  //         await TrackPlayer.play();
  //         setOpen(true);
  //       } finally {
  //         setIsSongLoading(false);
  //       }
  //     }
  //   };

  //   const subscription = Linking.addEventListener("url", handleDeepLink);
  //   return () => subscription.remove();
  // }, []);

  /* ---------- UI HANDLERS (UNCHANGED) ---------- */
  const routeToRecents = async () => {
    if (!userInfo) {
      Alert.alert(
        "Warning",
        "You are not logged in. Recently played songs are saved locally.",
      );
    }
    router.push("/recents");
  };

  const handlePress = async (section, song, index) => {
    // Decide what to do from the item itself, not from the section's name
    // (section names change every time the home feed is fetched).
    const type = getItemType(song);
    console.log("Pressed item:", type, "| section:", section);

    if (type === ITEM_TYPES.SONG) {
      try {
        const current = withVideoId(song);
        await TrackPlayer.reset();
        // setCurrentSong(song);
        setPlayingFrom("Home");
        const track = {
          id: current.videoId,
          url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${current.videoId
            }&email=${userInfo?.email || ""}`,
          title: current.title || "Unknown Title",
          artist: current.author || "Unknown Artist",
          artwork: current.thumbnail?.url || current.thumbnail,
        };
        await TrackPlayer.add(track);
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
        // setSongUrl(track.url);
        setCurrentSong(track);

        ToastAndroid.show("Song Is Added To The Queue", ToastAndroid.SHORT);
        setIsPlaying(true);

        // Queue = the songs from the pressed one to the end of its section
        const sectionList = Array.isArray(home?.[section])
          ? home[section]
          : [song];
        const startIndex = Array.isArray(home?.[section]) ? index : 0;
        const newQueue = sectionList
          .slice(startIndex)
          .filter((s) => getItemType(s) === ITEM_TYPES.SONG)
          .map(withVideoId);
        setCurrentQueue(newQueue);

        const tracks = newQueue.map((s) => ({
          id: s.videoId,
          url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${s.videoId
            }&email=${userInfo?.email || ""}`,
          title: s.title || "Unknown Title",
          artist: s.author || "Unknown Artist",
          artwork:
            s.thumbnail?.url ||
            s.thumbnail ||
            "https://via.placeholder.com/150",
        }));

        await TrackPlayer.setQueue(tracks);
        await saveToRecentlyPlayed(current);
        if (userInfo) {
          await handleRecentlyPlayed(userInfo?.email, current);
        }

        setIsSongLoading(false);
        setOpen(true);
      } catch (error) {
        console.error("Error setting queue and playing song:", error);
        setIsSongLoading(false);
        ToastAndroid.show("Error playing song", ToastAndroid.SHORT);
      }
    } else if (type === ITEM_TYPES.CUSTOM_PLAYLIST) {
      // The item already is the playlist, so there is nothing to look up
      setPlaylist(song);
      router.push({ pathname: "/playlist/" });
    } else if (type === ITEM_TYPES.PLAYLIST) {
      const id = song.browseId ?? song.playlistId;
      console.log("Getting Playlist...>", id);
      setIsPlaylistLoading(true);
      try {
        const results = await getPlaylistSongs(id);
        if (results) {
          setPlaylist(results);
          router.push({ pathname: "/playlist/" });
        } else {
          ToastAndroid.show("Couldn't load this playlist", ToastAndroid.SHORT);
        }
      } catch (error) {
        console.error("Error loading playlist:", error);
        ToastAndroid.show("Couldn't load this playlist", ToastAndroid.SHORT);
      } finally {
        setIsPlaylistLoading(false);
      }
    } else if (type === ITEM_TYPES.ALBUM) {
      const id = song.browseId ?? song.albumId;
      console.log("Getting Album.....>", id);
      setIsAlbumLoading(true);
      try {
        const results = await getAlbumSongs(id);
        if (results) {
          setAlbum(results);
          router.push({ pathname: "/album" });
        } else {
          ToastAndroid.show("Couldn't load this album", ToastAndroid.SHORT);
        }
      } catch (error) {
        console.error("Error loading album:", error);
        ToastAndroid.show("Couldn't load this album", ToastAndroid.SHORT);
      } finally {
        setIsAlbumLoading(false);
      }
    } else {
      console.warn("Unknown item type, can't open:", song);
      ToastAndroid.show("This item can't be opened", ToastAndroid.SHORT);
    }
  };

  const handleLike = () => {
    console.log("Like");
  };

  return (
    <ImageBackground
      source={require("@/assets/images/background.jpg")}
      blurRadius={10}
      style={{ flex: 1 }}
    >
      {/* Dark wash so section titles and cards read well on any background */}
      <View pointerEvents="none" style={styles.scrim} />
      <View
        style={[styles.container, { paddingBottom: currentSong ? hp(75) : 0 }]}
      >
        {/* Quick Access */}
        <View style={styles.quickAccessContainer}>
          <QuickAccessButton
            title="Recently Played"
            iconName="speaker"
            onPress={routeToRecents}
          />
          <QuickAccessButton
            title="Local Songs"
            iconName="folder"
            onPress={() => router.push("/local")}
          />
        </View>

        {/* Sections */}
        {home && !isLoading ? (
          <MusicSections
            data={home}
            onPlayPress={handlePress}
            onLikePress={handleLike}
          />
        ) : (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: hp(40) }}
          />
        )}

        <Loader isLoading={isPlaylistLoading || albumLoading} />
      </View>
    </ImageBackground>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.scrim,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  quickAccessContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sp(10),
    paddingHorizontal: sp(14),
    paddingTop: sp(8),
    paddingBottom: sp(4),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});