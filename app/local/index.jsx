import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@/context/User";
import Loader from "@/components/Loader";
import { TrackComponent } from "@/components/Component";

const LocalSongsScreen = () => {
  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { open, setOpen } = useSong();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setCurrentQueue } = usePlayer();
  const { userInfo, setUserInfo } = useUser();

  const { height } = Dimensions.get("window");

  const fetchLocals = async () => {
    try {
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please grant media library permissions to access local songs.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        sortBy: MediaLibrary.SortBy.modificationTime,
      });
      console.log("First asset:", assets[0]);
      setSongs(assets);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching local songs:", error);
      Alert.alert("Error", "Failed to fetch local songs.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocals();
  }, []);

  // Normalize song data to match TrackComponent's expected structure
  const normalizeSong = (item) => ({
    id: item.id,
    videoId: item.id, // Alias id as videoId for compatibility
    title: item.filename || "Unknown Song",
    author: "Unknown Artist", // Alias for artist
    artist: "Unknown Artist",
    uri: item.uri,
    duration: item.duration || 0,
    thumbnail: null, // No thumbnail for local songs
    artwork: null, // Alias for thumbnail
    filename: item.filename || "Unknown Song", // For display
  });

  return (
    <View style={styles.container}>
      {loading ? (
        <Loader isLoading={loading} />
      ) : songs.length > 0 ? (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackComponent
              item={normalizeSong(item)}
              songs={songs.map(normalizeSong)}
              setCurrentQueue={setCurrentQueue}
              setCurrentSong={setCurrentSong}
              setIsSongLoading={setIsSongLoading}
              setSongUrl={setSongUrl}
              index={index}
              userInfo={userInfo || {}}
              playingFrom="Local"
            />
          )}
          contentContainerStyle={{ flexDirection: "column" }}
          scrollEnabled={true}
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Text style={styles.noResults}>No Local Songs Found!!</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2F1C6A",
    padding: 20,
  },
  noResults: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
});

export default LocalSongsScreen;
