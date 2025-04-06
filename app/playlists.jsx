import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CreatePlaylistModal from "@/components/Create-Playlist";
import { createNewPlaylist, fetchUserPlaylists } from "@/constants/apiCalls";
import { useUser } from "@/context/User";
import Loader from "@/components/Loader";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PlaylistScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { userPlaylist, setUserPlaylist } = useUser();
  const { userInfo, setPlaylist, setPlaylistName } = useUser();
  const [loading, setLoading] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  useEffect(() => {
    const getPlaylists = async () => {
      setPlaylistLoading(true);
      const data =
        JSON.parse(await AsyncStorage.getItem("user-playlists")) || [];
      setPlaylistLoading(false);

      if (data.length > 0) {
        setUserPlaylist(data);
      } else {
        await fetchUserPlaylists(userInfo?.email, setUserPlaylist);
        await AsyncStorage.setItem(
          "user-playlists",
          JSON.stringify(userPlaylist)
        );
        setPlaylistLoading(false);
      }
    };
    getPlaylists();
  }, [handleCreatePlaylist]);

  const handleCreatePlaylist = async (name) => {
    setLoading(true);
    await createNewPlaylist(userInfo?.email, name, setUserPlaylist);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={24} color="white" />
        <Text style={styles.createButtonText}>Create New Playlist</Text>
      </TouchableOpacity>

      {!loading && !playlistLoading ? (
        <FlatList
          data={userPlaylist}
          keyExtractor={(item, index) => index}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistItem}
              onPress={() => {
                setPlaylistName(item.name);
                setPlaylist(item);
                router.navigate({
                  pathname: "/user-playlist",
                  params: { playlist: item },
                });
              }}
            >
              <Ionicons name="musical-notes" size={24} color="white" />
              <Text style={styles.playlistName}>{item.name}</Text>
              <Text style={styles.songCount}>{item.songs.length} songs</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No playlists found.</Text>
          }
        />
      ) : (
        <ActivityIndicator color={"#1DB954"} size={24} />
      )}
      <CreatePlaylistModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleCreatePlaylist}
      />
    </View>
  );
};

export default PlaylistScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1DB954",
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 16,
    color: "white",
    marginLeft: 8,
    fontWeight: "600",
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#282828",
    borderRadius: 10,
    marginBottom: 10,
  },
  playlistName: {
    fontSize: 16,
    color: "white",
    flex: 1,
    marginLeft: 10,
  },
  songCount: {
    fontSize: 14,
    color: "#B3B3B3",
  },
  emptyText: {
    textAlign: "center",
    color: "#B3B3B3",
    fontSize: 16,
    marginTop: 20,
  },
});
