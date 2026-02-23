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

const { width, height } = Dimensions.get("window");

/* ---------- THEME ---------- */
const COLORS = {
  background: "#121212",
  surface: "#1E1E1E",
  surfaceAlt: "#2A2A2A",
  primary: "#1DB954",
  textPrimary: "#FFFFFF",
  textSecondary: "#CFCFCF",
  textMuted: "#9A9A9A",
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
  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      let { queryParams } = Linking.parse(url);

      if (queryParams?.id) {
        setIsSongLoading(true);
        setPlayingFrom("Share");
        try {
          const song = {
            videoId: queryParams.id,
            title: decodeURIComponent(queryParams.title),
            author: decodeURIComponent(queryParams.author),
            thumbnail: decodeURIComponent(queryParams.thumbnail),
          };

          await saveToRecentlyPlayed(song);
          if (userInfo) await handleRecentlyPlayed(userInfo.email, song);

          setCurrentSong(song);

          const track = {
            id: song.videoId,
            url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${song.videoId}&email=${userInfo?.email || ""}`,
            title: song.title,
            artist: song.author,
            artwork: song.thumbnail,
          };

          await TrackPlayer.reset();
          await TrackPlayer.add(track);
          await TrackPlayer.play();
          setOpen(true);
        } finally {
          setIsSongLoading(false);
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

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
    console.log("Section: ", section);
    if (section === "quick_picks") {
      try {
        await TrackPlayer.reset();
        // setCurrentSong(song);
        setPlayingFrom("Home");
        const track = {
          id: song.videoId,
          url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${
            song.videoId
          }&email=${userInfo?.email || ""}`,
          title: song.title || "Unknown Title",
          artist: song.author || "Unknown Artist",
          artwork: song.thumbnail?.url || song.thumbnail,
        };
        await TrackPlayer.add(track);
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
        // setSongUrl(track.url);
        setCurrentSong(track);

        ToastAndroid.show("Song Is Added To The Queue", ToastAndroid.SHORT);
        setIsPlaying(true);

        const newQueue = home?.quick_picks.slice(
          index,
          home?.quick_picks.length,
        );
        setCurrentQueue(newQueue);

        const tracks = newQueue.map((s) => ({
          id: s.videoId,
          url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${
            s.videoId
          }&email=${userInfo?.email || ""}`,
          title: s.title || "Unknown Title",
          artist: s.author || "Unknown Artist",
          artwork:
            s.thumbnail?.url ||
            s.thumbnail ||
            "https://via.placeholder.com/150",
        }));

        await TrackPlayer.setQueue(tracks);
        await saveToRecentlyPlayed(song);
        if (userInfo) {
          await handleRecentlyPlayed(userInfo?.email, song);
        }

        setIsSongLoading(false);
        setOpen(true);
      } catch (error) {
        console.error("Error setting queue and playing song:", error);
        setIsSongLoading(false);
        ToastAndroid.show("Error playing song", ToastAndroid.SHORT);
      }
    } else if (section === "playlist") {
      console.log("Getting Playlist...>", song.browseId);
      setIsPlaylistLoading(true);
      const results = await getPlaylistSongs(song.browseId);
      if (results) {
        setPlaylist(results);
        setIsPlaylistLoading(false);
        router.push({
          pathname: "/playlist/",
        });
      }
    } else if (section === "custom_playlists") {
      setIsPlaylistLoading(true);
      const savedHome = JSON.parse(await AsyncStorage.getItem("home"));
      if (savedHome?.custom_playlists) {
        console.log(savedHome.custom_playlists);
        setPlaylist(savedHome?.custom_playlists[index]);
        router.push({ pathname: "/playlist/" });
        setIsPlaylistLoading(false);
      }
    } else {
      console.log("Getting Album.....>", song.browseId);
      setIsAlbumLoading(true);
      const results = await getAlbumSongs(song.browseId);
      if (results) {
        setIsAlbumLoading(false);
        setAlbum(results);
        router.push({ pathname: "/album" });
      }
    }
  };

  const handleLike = () => {
    console.log("Like");
  };

  return (
    <View
      style={[styles.container, { paddingBottom: currentSong ? hp(90) : 0 }]}
    >
      <ImageBackground
        source={ require("@/assets/images/background.jpg")}
        blurRadius={10}
        style={{flex: 1}}
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
      </ImageBackground>
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  quickAccessContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sp(10),
    padding: sp(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderBottomLeftRadius: sp(16),
    borderBottomRightRadius: sp(16),
  },
});
