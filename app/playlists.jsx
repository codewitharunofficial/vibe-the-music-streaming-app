import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  ImageBackground,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CreatePlaylistModal from "@/components/Create-Playlist";
import { createNewPlaylist, fetchUserPlaylists } from "@/constants/apiCalls";
import { useUser } from "@/context/User";
import { useSong } from "@/context/SongContext";
import { hp } from "@/utils/responsive";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Design tokens (same palette as the rest of the app)
const UI = {
  surface: "#0B3047",
  surfaceHi: "#124562",
  ink: "#061E2B",
  accent: "#FF9F1C",
  glass: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.10)",
  textHi: "#FFFFFF",
  textMid: "rgba(255,255,255,0.72)",
  textLow: "rgba(255,255,255,0.45)",
  scrim: "rgba(4,24,35,0.55)",
};

// Cover = first song's artwork, falling back to the playlist's own poster
const getCover = (item) => {
  const first = item?.songs?.[0]?.thumbnail;
  return first?.url || first || item?.poster || null;
};

const PlaylistScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { userInfo, userPlaylist, setUserPlaylist, setPlaylist, setPlaylistName } =
    useUser();
  const { currentSong } = useSong();
  const [loading, setLoading] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // Load the playlists once per signed-in user (the old dependency
  // `[handleCreatePlaylist]` was a new function on every render, so this
  // effect re-ran on every render).
  useEffect(() => {
    const getPlaylists = async () => {
      if (!userInfo?._id) {
        setUserPlaylist([]);
        return;
      }

      try {
        setPlaylistLoading(true);
        const data =
          JSON.parse(await AsyncStorage.getItem("user-playlists")) || [];

        if (data.length > 0) {
          setUserPlaylist(data);
        } else {
          await fetchUserPlaylists(userInfo._id, setUserPlaylist);
        }
      } catch (error) {
        console.log("Error loading playlists:", error);
      } finally {
        setPlaylistLoading(false);
      }
    };
    getPlaylists();
  }, [userInfo?._id]);

  const handleCreatePlaylist = async (name) => {
    try {
      setLoading(true);
      const data = await createNewPlaylist(userInfo?._id, name);
      console.log("Update Data for user playlists : ", data);
      if (data?.length > 0) {
        setUserPlaylist(data);
        await AsyncStorage.setItem("user-playlists", JSON.stringify(data));
      }
    } catch (error) {
      console.log("Error creating playlist:", error);
      Alert.alert("Error", "Couldn't create the playlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (!userInfo) {
      Alert.alert("Sign in required", "Please sign in to create playlists.");
      return;
    }
    setModalVisible(true);
  };

  const playlists = userPlaylist || [];

  return (
    <ImageBackground
      source={require("@/assets/images/background.jpg")}
      blurRadius={10}
      style={{ flex: 1 }}
    >
      {/* Dark wash so the cards read well on any background */}
      <View pointerEvents="none" style={styles.scrim} />
      <View style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.createButton}
          onPress={openCreate}
        >
          <Ionicons name="add" size={24} color={UI.ink} />
          <Text style={styles.createButtonText}>Create New Playlist</Text>
        </TouchableOpacity>

        {!loading && !playlistLoading ? (
          <FlatList
            data={playlists}
            keyExtractor={(item, index) => item?._id?.toString() || String(index)}
            showsVerticalScrollIndicator={false}
            // Keep the last rows clear of the mini player
            contentContainerStyle={{
              paddingBottom: currentSong ? hp(230) : 24,
              flexGrow: 1,
            }}
            ListHeaderComponent={
              playlists.length > 0 ? (
                <Text style={styles.count}>
                  {playlists.length}{" "}
                  {playlists.length === 1 ? "playlist" : "playlists"}
                </Text>
              ) : null
            }
            renderItem={({ item }) => {
              const cover = getCover(item);
              const count = item.songs?.length ?? 0;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.playlistItem}
                  onPress={() => {
                    setPlaylistName(item.name);
                    setPlaylist(item);
                    // The playlist itself goes through the context above;
                    // route params can only hold strings, so none are passed.
                    router.navigate({ pathname: "/user-playlist" });
                  }}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.cover} />
                  ) : (
                    <View style={[styles.cover, styles.coverEmpty]}>
                      <Ionicons
                        name="musical-notes"
                        size={24}
                        color={UI.textLow}
                      />
                    </View>
                  )}
                  <View style={styles.playlistInfo}>
                    <Text numberOfLines={1} style={styles.playlistName}>
                      {item.name}
                    </Text>
                    <Text style={styles.songCount}>
                      {count} {count === 1 ? "song" : "songs"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={UI.textLow}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="albums-outline" size={38} color={UI.accent} />
                </View>
                <Text style={styles.emptyTitle}>
                  {userInfo ? "No playlists yet" : "Sign in to get started"}
                </Text>
                <Text style={styles.emptyText}>
                  {userInfo
                    ? "Create your first playlist and add songs from anywhere in Vibe."
                    : "Sign in to create playlists and see them here."}
                </Text>
              </View>
            }
          />
        ) : (
          <View style={styles.loader}>
            <ActivityIndicator color={UI.accent} size="large" />
          </View>
        )}
        <CreatePlaylistModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleCreatePlaylist}
        />
      </View>
    </ImageBackground>
  );
};

export default PlaylistScreen;

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.scrim,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 20,
  },

  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: UI.accent,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 18,
    shadowColor: UI.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  createButtonText: {
    fontSize: 16,
    color: UI.ink,
    fontWeight: "800",
  },

  count: {
    color: UI.textLow,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 10,
    marginLeft: 4,
  },

  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: UI.surface,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  cover: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: UI.surfaceHi,
  },

  coverEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },

  playlistInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
    gap: 4,
  },

  playlistName: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.textHi,
  },

  songCount: {
    fontSize: 13,
    color: UI.textMid,
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
  },

  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: UI.glass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    color: UI.textHi,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 6,
  },

  emptyText: {
    textAlign: "center",
    color: UI.textMid,
    fontSize: 14,
    lineHeight: 20,
  },
});