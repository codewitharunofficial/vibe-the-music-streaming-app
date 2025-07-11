import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  ToastAndroid,
} from "react-native";
import { View } from "@/components/Themed";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchHome,
  getAlbumSongs,
  getCustomPlaylists,
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
// import { Audio } from "expo-av";

export default function Home() {
  const [home, setHome] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { height } = Dimensions.get("window");

  const { open, setOpen } = useSong();

  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { isPlaying, setIsPlaying } = usePlayer();
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const { currentQueue, setCurrentQueue, setPlayingFrom } = usePlayer();
  const { setPlaylist, setAlbum } = usePlaylist();
  const [albumLoading, setIsAlbumLoading] = useState(false);
  const { userInfo, setUserInfo, setUserPlaylist } = useUser();

  const savedHome = async () => {
    const results = JSON.parse(await AsyncStorage.getItem("home"));
    // console.log(results);
    if (results) {
      const isOutdated =
        new Date().getTime() >
        JSON.parse(await AsyncStorage.getItem("home_updated_at"));
      if (isOutdated) {
        console.log(userInfo);
        const newResults = await fetchHome(setIsLoading, userInfo?.email || "");

        if (newResults) {
          setHome(newResults);
        }
      }
      setHome(results);
    } else {
      const results = await fetchHome(setIsLoading, userInfo?.email || "");
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

      if (queryParams.id) {
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

          if (userInfo) {
            await handleRecentlyPlayed(userInfo?.email, song);
          }

          setCurrentSong(song);

          const track = {
            id: song.videoId,
            url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${
              song.videoId
            }&email=${userInfo?.email || ""}`,
            title: song.title || "Unknown Title",
            artist: song.author || "Unknown Artist",
            artwork: decodeURIComponent(queryParams.thumbnail),
          };

          await TrackPlayer.reset();
          await TrackPlayer.add(track);
          await TrackPlayer.skip(0);
          await TrackPlayer.play();
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
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        if (url.startsWith("file://") || url.startsWith("content://")) {
          try {
            setIsSongLoading(true);
            setPlayingFrom("External");
            const fileName = url.split("/").pop();
            const track = {
              id: Date.now().toString(),
              url: url,
              title: decodeURIComponent(fileName || "Audio File"),
              artist: "UnKnown Artist",
              artwork:
                "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
            };

            setCurrentSong(track);

            await TrackPlayer.setupPlayer();

            await TrackPlayer.reset();
            await TrackPlayer.add(track);
            await TrackPlayer.skip(0);
            await TrackPlayer.play();
            setIsPlaying(true);
            setOpen(true);
          } catch (err) {
            console.error("Error handling audio file intent:", err);
          } finally {
            setIsSongLoading(false);
          }
        } else {
          handleDeepLink({ url });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
          home?.quick_picks.length
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
          title={"Local Songs"}
          iconName={"folder"}
          onPress={() => router.navigate({ pathname: "/local" })}
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
