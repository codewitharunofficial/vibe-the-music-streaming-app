import React from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { playASongs } from "@/constants/apiCalls";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";

const PlaylistScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { data } = useLocalSearchParams();
  const playlist = JSON.parse(data);

  const { setSongUrl, setIsSongLoading, setCurrentSong, currentSong } = useSong();
  const {currentQueue, setCurrentQueue} = usePlayer();

  const playSong = async (song) => {
    console.log("Playing song:", song);
    setCurrentSong(song);
    setCurrentQueue(playlist.results);
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
  };

  return (
    <View style={[styles.container, {flex: currentSong ? 0.9 : 1}]}>
      {/* Playlist Details */}
      <View style={styles.header}>
        <Image
          source={{ uri: playlist.playlistCover }}
          style={styles.coverImage}
        />
        <View style={styles.details}>
          <Text style={styles.title}>{playlist.title}</Text>
          <Text style={styles.author}>{playlist.playlistAuthor}</Text>
          <Text style={styles.release}>{playlist.playlistRelease}</Text>
          <Text style={styles.description}>{playlist.playlistDescription}</Text>
        </View>
      </View>

      {/* Songs List */}
      <FlatList
        data={playlist.results}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.songItem}
            onPress={() => playSong(item)}
          >
            <Text style={styles.songTitle}>{item.title?.slice(0, 30)}</Text>
            <Text style={styles.songArtist}>{item.author?.slice(0, 30)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 0.8,
    backgroundColor: "#121212",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    marginBottom: 20,
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  details: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  author: {
    fontSize: 14,
    color: "#bbb",
  },
  release: {
    fontSize: 14,
    color: "#bbb",
  },
  description: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 5,
  },
  songItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  songTitle: {
    fontSize: 16,
    color: "#fff",
  },
  songArtist: {
    fontSize: 14,
    color: "#bbb",
  },
});

export default PlaylistScreen;
