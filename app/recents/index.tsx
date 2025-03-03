import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { playASongs } from "@/constants/apiCalls";
import { useSong } from "@/context/SongContext";
import { getRecentlyPlayed } from "@/constants/cachedData";
import { usePlayer } from "@/context/PlayerContext";
import { playSong } from "@/constants/player";

const SearchScreen = () => {
  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { open, setOpen } = useSong();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setCurrentQueue } = usePlayer();

  useEffect(() => {
    getRecentlyPlayed(setIsSongLoading, setSongs);
  }, []);

  return (
    <View style={[styles.container, { flex: currentSong ? 0.9 : 1 }]}>
      {/* Songs List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="white"
          style={{ marginTop: 20 }}
        />
      ) : songs.length > 0 ? (
        <FlatList
          data={songs}
          keyExtractor={(item) => item?.videoId.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={async () => {
                await playSong(
                  item,
                  setIsSongLoading,
                  setCurrentSong,
                  setSongUrl
                );
                setCurrentQueue(songs);
              }}
              style={styles.songItem}
            >
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.songImage}
              />
              <View style={styles.songDetails}>
                <Text style={styles.songTitle}>{item.title?.slice(0, 30)}</Text>
                <Text style={styles.songArtist}>
                  {item.author?.slice(0, 30)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ flexDirection: "column-reverse" }}
          scrollEnabled={true}
          alwaysBounceVertical
        />
      ) : (
        <Text style={styles.noResults}>No Recently Played Songs Found.</Text>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1C",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  songDetails: {
    marginLeft: 15,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  songArtist: {
    fontSize: 14,
    color: "#AAA",
  },
  noResults: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
});

export default SearchScreen;
