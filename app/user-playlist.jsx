import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import TrackPlayer, {
  State,
  usePlaybackState,
} from "react-native-track-player";
import { useUser } from "@/context/User";
import { playASongs, updateUserPlaylist } from "@/constants/apiCalls";
import { usePlayer } from "@/context/PlayerContext";
import { useSong } from "@/context/SongContext";
import { saveToRecentlyPlayed } from "@/constants/cachedData";
import CreatePlaylistModal from "@/components/Create-Playlist";
import RenamePlaylistModal from "@/components/Rename-Playlist";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UserPlaylistScreen = () => {
  const { playlist, userInfo, setPlaylist } = useUser();
  const { setCurrentQueue, setIsPlaying, setPlayingFrom } = usePlayer();
  const { setSongUrl, setCurrentSong, currentSong, setIsSongLoading } =
    useSong();
  const [playlistName, setPlaylistName] = useState(playlist.name);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const playbackState = usePlaybackState();
  const { width, height } = Dimensions.get("window");

  console.log(playlist);

  const play = async (item, index) => {
    try {
      setPlayingFrom(playlistName);
      if (!userInfo) {
        await saveToRecentlyPlayed(item);
      }

      setCurrentSong(item);
      const newQueue = playlist.songs.slice(index, playlist.songs.length);
      setCurrentQueue(newQueue);

      await TrackPlayer.reset();
      const tracks = newQueue.map((s) => ({
        id: s.videoId || s.id,
        url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${
          s.videoId || s.id
        }&email=${userInfo?.email || ""}`,
        title: s.title || "Unknown Title",
        artist: s.author || "Unknown Artist",
        artwork:
          s.thumbnail?.url || s.thumbnail || "https://via.placeholder.com/150",
      }));

      await TrackPlayer.add(tracks);
      await TrackPlayer.skip(0); // Play the first song in the queue
      await TrackPlayer.play();

      setIsPlaying(true);
      setIsSongLoading(false);
      // setOpen(true);
    } catch (error) {
      console.error("Error setting queue and playing song:", error);
      setIsSongLoading(false);
      ToastAndroid.show("Error playing song", ToastAndroid.SHORT);
    }
  };

  const handlePlayAll = async () => {
    await TrackPlayer.reset();
    const tracks = playlist?.songs?.map((song) => ({
      id: song?.videoId || song?.id,
      url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${
        song.videoId || song.id
      }&email=${userInfo?.email || ""}`,
      title: song.title,
      artist: song.author || "Unknown Author",
      artwork: song.thumbnail?.url || song.thumbnail || song.artwork,
    }));
    await TrackPlayer.add(tracks);
    setCurrentSong(tracks[0]);
    await TrackPlayer.play();

    const queue = await TrackPlayer.getQueue();
    setCurrentQueue(queue);
  };

  const handleUpdatePlaylist = async (id, name, type) => {
    try {
      const updatedPlaylists = await updateUserPlaylist(id, name, type);

      if (updatedPlaylists) {
        await AsyncStorage.setItem(
          "user-playlists",
          JSON.stringify(updatedPlaylists)
        );
        setPlaylist(updatedPlaylists.find((p) => p._id === id));
        ToastAndroid.show(
          `Playlist is now ${playlist.type}`,
          ToastAndroid.SHORT
        );
      }
    } catch (error) {
      console.error("Error updating playlist:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={{ marginBottom: 0, flexDirection: "row", flexWrap: "wrap" }}
        >
          <Image
            source={{ uri: playlist.songs[0].thumbnail || playlist?.poster }}
            style={[
              styles.thumbnail,
              {
                height: height * 0.25,
                width: width - 40,
                objectFit: "fill",
                margin: 0,
                borderRadius: 0,
              },
            ]}
          />
        </TouchableOpacity>
      </View>

      <View
        style={{
          width: width,
          height: 50,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          alignSelf: "center",
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          style={[
            styles.playAllButton,
            ,
            { backgroundColor: "lightgreen", flexDirection: "row", gap: 1 },
          ]}
          onPress={handlePlayAll}
        >
          <MaterialIcons name={"playlist-play"} size={20} color={"#000"} />
          <Text style={[styles.playAllText, { color: "#000" }]}>Play All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.playAllButton,
            ,
            { backgroundColor: "yellow", flexDirection: "row", gap: 3 },
          ]}
          onPress={() =>
            handleUpdatePlaylist(
              playlist._id,
              playlistName,
              playlist.type === "Private" ? "Public" : "Private"
            )
          }
        >
          <MaterialIcons
            name={playlist?.type === "Private" ? "public" : "public-off"}
            size={20}
            color={"#000"}
          />
          <Text style={[styles.playAllText, { color: "#000" }]}>
            {playlist?.type === "Private" ? "Public" : "Private"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.playAllButton,
            ,
            { backgroundColor: "cyan", flexDirection: "row", gap: 3 },
          ]}
          onPress={() => {
            setShowRenameModal(true);
          }}
        >
          <MaterialIcons name={"edit-square"} size={20} color={"#000"} />
          <Text style={[styles.playAllText, { color: "#000" }]}>Rename</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlist.songs}
        keyExtractor={(item) => item.videoId}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.songContainer}
            onPress={() => play(item, index)}
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
            {(playbackState.state === State.Loading ||
              playbackState.state === State.Buffering) &&
            currentSong.videoId === item.videoId ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (currentSong?.videoId === item.videoId) {
                    TrackPlayer.play();
                  } else {
                    play(item, index);
                  }
                }}
              >
                <Ionicons
                  name={
                    currentSong?.videoId === item.videoId &&
                    playbackState.state === State.Playing
                      ? "pause"
                      : "play"
                  }
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
      <RenamePlaylistModal
        visible={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onSave={handleUpdatePlaylist}
        id={playlist._id}
        type={playlist.type}
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
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 0,
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
    paddingHorizontal: 15,
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
    marginLeft: 3,
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
