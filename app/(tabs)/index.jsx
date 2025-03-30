import { ActivityIndicator, Alert, Dimensions, StyleSheet } from "react-native";
import { View } from "@/components/Themed";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchHome,
  getAlbumSongs,
  getPlaylistSongs,
  handleRecentlyPlayed,
  playASongs,
} from "@/constants/apiCalls";
import {
  MiniPlayer,
  MusicSections,
  NowPlayingScreen,
  QuickAccessButton,
  SongsList,
} from "@/components/Component";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { router } from "expo-router";
import { saveToRecentlyPlayed } from "@/constants/cachedData";
import Loader from "@/components/Loader";
import { usePlaylist } from "@/context/Playlist";
import TrackPlayer from "react-native-track-player";
import { useUser } from "@/context/User";
import * as Linking from "expo-linking";
// import { Audio } from "expo-av";

export default function Home() {
  const [home, setHome] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { height } = Dimensions.get("window");

  const { open, setOpen } = useSong();

  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { isPlaying } = usePlayer();
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const { currentQueue, setCurrentQueue } = usePlayer();
  const { setPlaylist, setAlbum } = usePlaylist();
  const [albumLoading, setIsAlbumLoading] = useState(false);
  const { userInfo, setUserInfo } = useUser();

  const savedHome = async () => {
    const results = JSON.parse(await AsyncStorage.getItem("home"));
    if (results) {
      const isOutdated =
        new Date().getTime() >
        JSON.parse(await AsyncStorage.getItem("home_updated_at"));
      if (isOutdated) {
        const newResults = await fetchHome(setIsLoading);
        if (newResults) {
          setHome(newResults);
        }
      }
      setHome(results);
    } else {
      const results = await fetchHome(setIsLoading);
      if (results) {
        setHome(results);
      }
    }
  };

  useEffect(() => {
    savedHome();
  }, []);

  useEffect(() => {
    const handleDeepLink = async ({ url }) => {
      let { queryParams } = Linking.parse(url);
      // console.log("Deep Link Opened:", queryParams);

      if (queryParams.id) {
        setIsSongLoading(true);

        try {
          const song = {
            videoId: queryParams.id,
            title: decodeURIComponent(queryParams.title),
            author: decodeURIComponent(queryParams.author),
            thumbnail: decodeURIComponent(queryParams.thumbnail),
          };
          await saveToRecentlyPlayed(song);
          setCurrentSong(song);
          const url = await playASongs(song.videoId, userInfo?.email, song);
          if (url) {
            console.log("URL: ", url);
            setSongUrl(url);
            setIsSongLoading(false);
            setOpen(true);
          } else {
            console.log("Unable TO Fetch URL");
            setIsSongLoading(false);
          }
        } catch (error) {
          console.error("Error fetching song:", error);
        } finally {
          setIsSongLoading(false);
        }
      } else {
        console.log("No Routing Anywhere");
        router.replace({ pathname: "/(tabs)" });
        if (currentSong) {
          setOpen(true);
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handlePress = async (section, song, index) => {
    console.log("Section: ", section);
    if (section === "quick_picks") {
      if (!userInfo) {
        await saveToRecentlyPlayed(song);
      }
      setCurrentSong(song);
      setCurrentQueue(
        home?.quick_picks.slice(index, home?.quick_picks.length - 1)
      );
      setIsSongLoading(true);
      await TrackPlayer.reset();
      const url = await playASongs(
        song.videoId,
        userInfo?.email,
        song,
        setCurrentSong,
        song
      );
      if (url) {
        console.log("URL: ", url);
        setSongUrl(url);
        setIsSongLoading(false);
        // setOpen(true);
      } else {
        console.log("Unable TO Fetch URL");
        setIsSongLoading(false);
      }
    } else if (section === "playlist") {
      console.log("Getting Playlist...>", song.browseId);
      setIsPlaylistLoading(true);
      const results = await getPlaylistSongs(song.browseId);
      if (results) {
        setPlaylist(results);
        // console.log(results);
        setIsPlaylistLoading(false);
        router.push({
          pathname: "/playlist/",
        });
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

  const routeToLike = () => {
    if (userInfo) {
      router.push("/recents/");
    } else {
      Alert.alert(
        "Warning",
        "You are not logged in and so all the tracks in the Liked Songs List Are Saved Locally. If you remove or re-install Vibe in future, you'll lose all of your data. To avoid Please Logging Or Register"
      );
      router.push("/recents");
    }
  };

  const routeToRecents = async () => {
    if (userInfo) {
      router.push("/recents");
    } else {
      Alert.alert(
        "Warning",
        "You are not logged in and so all the tracks in the Recently Played List Are Saved Locally. If you remove or re-install Vibe in future, you'll lose all of your data. To avoid Please Logging Or Register"
      );
      router.push("/recents");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: currentSong ? height * 0.1 : 0 },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 10,
          flexWrap: "wrap",
          alignItems: "center",
          alignSelf: "center",
          backgroundColor: "#2F1C6A",
        }}
      >
        <QuickAccessButton
          title={"Recently Played"}
          iconName={"speaker"}
          onPress={() => routeToRecents()}
        />
        <QuickAccessButton
          title={"Favourites"}
          iconName={"heart"}
          onPress={() => router.navigate({ pathname: "/favourites" })}
        />
      </View>
      {home && !isLoading ? (
        <MusicSections
          data={home}
          onLikePress={handleLike}
          onPlayPress={handlePress}
        />
      ) : (
        <ActivityIndicator size={"large"} color={"#fff"} />
      )}
      <Loader isLoading={isPlaylistLoading || albumLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#2F1C6A",
    // justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
