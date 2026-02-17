import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@/context/User";
import { TrackComponent } from "@/components/Component";
import {COLORS} from "@/utils/colors";

const SearchScreen = () => {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  const { songUrl, setSongUrl, isSongLoading, setIsSongLoading, currentSong, setCurrentSong, open, setOpen } = useSong();
  const { setCurrentQueue } = usePlayer();
  const { userInfo } = useUser();
  const { height } = Dimensions.get("window");

  const API_KEY = process.env.EXPO_PUBLIC_API_KEY_1;
  const API_HOST = process.env.EXPO_PUBLIC_API_HOST_1;

  const fetchSongs = async () => {
    if (!query.trim() || !API_KEY || !API_HOST) return;

    setLoading(true);
    try {
      const { data } = await axios.request({
        method: "GET",
        url: "https://youtube-music-api3.p.rapidapi.com/search",
        params: { q: query, type: "song" },
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });

      if (data?.result) {
        setSongs(data.result);
        setToken(data.nextPageToken || "");
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSongs = async () => {
    if (!token || !API_KEY || !API_HOST) return;

    setLoading(true);
    try {
      const { data } = await axios.request({
        method: "GET",
        url: "https://youtube-music-api3.p.rapidapi.com/search",
        params: {
          q: query,
          type: "song",
          nextPage: token,
        },
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });

      if (data?.result) {
        setSongs((prev) => [...prev, ...data.result]);
        setToken(data.nextPageToken || "");
      }
    } catch (error) {
      console.error("Pagination error:", error);
    } finally {
      setLoading(false);
    }
  };

  const footerItem = () => (
    <View style={styles.footer}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: currentSong ? height * 0.09 : 0 },
      ]}
    >
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search songs..."
          placeholderTextColor="#ffff"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={fetchSongs}
        />
        <TouchableOpacity onPress={fetchSongs} style={styles.searchButton}>
          <Ionicons name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Song List */}
      {loading && songs.length === 0 ? (
        <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />
      ) : songs.length > 0 ? (
        <FlatList
          data={songs}
          keyExtractor={(item, index) => item?.videoId || index.toString()}
          renderItem={({ item, index }) => (
            <TrackComponent
              item={item}
              songs={songs}
              index={index}
              setCurrentQueue={setCurrentQueue}
              setCurrentSong={setCurrentSong}
              setIsSongLoading={setIsSongLoading}
              setSongUrl={setSongUrl}
              userInfo={userInfo}
              playingFrom="Search"
            />
          )}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreSongs}
          onEndReachedThreshold={0.5}
          ListFooterComponent={token ? footerItem : null}
        />
      ) : (
        <Text style={styles.noResults}>No songs found.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  searchButton: {
    padding: 5,
  },
  noResults: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
  footer: {
    width: "100%",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchScreen;
