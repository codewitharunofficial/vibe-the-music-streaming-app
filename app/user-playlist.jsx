import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TrackPlayer, { usePlaybackState } from "react-native-track-player";
import { useUser } from "@/context/User";
import { playASongs } from "@/constants/apiCalls";
import { usePlayer } from "@/context/PlayerContext";
import { useSong } from "@/context/SongContext";

const UserPlaylistScreen = () => {
  const { playlist, userInfo } = useUser();
  const { setCurrentQueue } = usePlayer();
  const { setSongUrl, setCurrentSong, currentSong } = useSong();

  const playbackState = usePlaybackState();

  console.log(playlist);

  const handlePlaySong = async (song) => {
    const url = await playASongs(song.videoId, userInfo?.email, song);
    if (url) {
      setCurrentSong(song);
      setSongUrl(url);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: song.videoId,
        url: url,
        title: song.title,
        artist: song.author,
        artwork: song.thumbnail?.url || song.thumbnail,
      });
      await TrackPlayer.play();
      setCurrentQueue(playlist.songs);
    } else {
      console.log("Error While Fetching Song URL");
    }
  };

  const handlePlayAll = async () => {
    await TrackPlayer.reset();
    const tracks = playlist.songs.map((song) => ({
      id: song.videoId,
      url: song.url,
      title: song.title,
      artist: song.author,
      artwork: song.thumbnail?.url || song.thumbnail,
    }));
    await TrackPlayer.add(tracks);
    await TrackPlayer.play();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.playlistTitle}>{playlist.name}</Text>
        <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
          <Ionicons name="play-circle" size={24} color="white" />
          <Text style={styles.playAllText}>Play All</Text>
        </TouchableOpacity>
      </View>

      {/* Song List */}
      <FlatList
        data={playlist.songs}
        keyExtractor={(item) => item.videoId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.songContainer}
            onPress={() => handlePlaySong(item)}
          >
            <Image
              source={{ uri: item.thumbnail?.url || item.thumbnail }}
              style={styles.thumbnail}
            />
            <View style={styles.songDetails}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {item.title?.slice(0, 20)}
              </Text>
              <Text style={styles.songArtist}>{item.author?.slice(0, 20)}</Text>
            </View>
            {currentSong && currentSong.videoId === item.videoId ? (
              <Ionicons name="pause" size={24} color="white" />
            ) : (
              <Ionicons name="play" size={24} color="white" />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default UserPlaylistScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
  },
  playlistTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textTransform: "capitalize",
  },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  playAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
  songContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 10,
  },
  thumbnail: {
    width: 55,
    height: 55,
    borderRadius: 8,
    marginRight: 12,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  songArtist: {
    fontSize: 14,
    color: "#B3B3B3",
  },
});
