import { ActivityIndicator, StyleSheet } from "react-native";
import { View } from "@/components/Themed";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchHome, getPlaylistSongs, playASongs } from "@/constants/apiCalls";
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
import { Audio } from "expo-av";

export default function Home() {
  const [home, setHome] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { isPlaying } = usePlayer();
  const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);
  const { currentQueue, setCurrentQueue } = usePlayer();

  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio?.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        interruptionModeAndroid: Audio?.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
      });
    };
    setupAudio();
  }, []);

  useEffect(() => {
    const checkAudioMode = async () => {
      const status = await Audio?.getStatusAsync();
      console.log("Audio Mode Status:", status);
    };
    checkAudioMode();
  }, []);

  const savedHome = async () => {
    const results = JSON.parse(await AsyncStorage.getItem("home"));
    if (results) {
      setHome(results);
      // console.log("Loading Saved Home: ", results);
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

  const handlePress = async (section, song) => {
    console.log("Section: ", section);
    if (section === "quick_picks") {
      await saveToRecentlyPlayed(song);
      setCurrentSong(song);
      setCurrentQueue(home?.quick_picks);
      setIsSongLoading(true);
      const url = await playASongs(song.videoId);
      if (url) {
        console.log("URL: ", url);
        setSongUrl(url);
        setIsSongLoading(false);
        // setOpen(true);
      } else {
        console.log("Unable TO Fetch URL");
        setIsSongLoading(false);
      }
    } else if (section === "today's_hits") {
      console.log("Getting Playlist...>");
      setIsPlaylistLoading(true);
      const results = await getPlaylistSongs(song.browseId);
      if (results) {
        setIsPlaylistLoading(false);
        router.push({
          pathname: "/playlist",
          params: { data: JSON.stringify(results) },
        });
      }
    }
  };

  const handleLike = () => {
    console.log("Like");
  };

  const routeToRecents = () => {
    router.push("/recents");
  };

  const routeTotrends = () => {
    router.push("/trendings/");
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          padding: 10,
          flexWrap: "wrap",
          alignItems: "center",
          alignSelf: "center",
        }}
      >
        <QuickAccessButton
          title={"Recently Played"}
          iconName={"speaker"}
          onPress={() => routeToRecents()}
        />
        <QuickAccessButton
          title={"Liked Songs"}
          iconName={"heart"}
          onPress={() => console.log("Pressed")}
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
      <Loader isLoading={isPlaylistLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
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
