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
  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { open, setOpen } = useSong();
  const { setCurrentQueue } = usePlayer();
  const { height } = Dimensions.get("window");
  const { userInfo, setUserInfo } = useUser();

  const fetchSongs = async () => {
    if (query.trim() === "") return;

    setLoading(true);
    const options = {
      method: "GET",
      url: "https://youtube-music-api3.p.rapidapi.com/search",
      params: {
        q: query,
        type: "song",
      },
      headers: {
        "x-rapidapi-key": "b1c26628e0msh3fbbf13ea24b4abp184561jsna2ebae86e910",
        "x-rapidapi-host": "youtube-music-api3.p.rapidapi.com",
      },
    };

    try {
      const { data } = await axios.request(options);
      if (data?.result) {
        setSongs(data?.result);
        setToken(data?.nextPageToken);
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <View
      style={[
        styles.container,
        { flex: 1, paddingBottom: currentSong ? height * 0.09 : 0 },
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

      {/* Songs List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="white"
          style={{ marginTop: 20 }}
        />
      ) : songs?.length > 0 ? (
        <FlatList
          data={songs}
          keyExtractor={(item) => item?.videoId.toString()}
          renderItem={({ item, index }) => (
            <TrackComponent
              item={item}
              songs={songs}
              setCurrentQueue={setCurrentQueue}
              setCurrentSong={setCurrentSong}
              setIsSongLoading={setIsSongLoading}
              setSongUrl={setSongUrl}
              index={index}
              userInfo={userInfo}
              playingFrom={"Search"}
            />
          )}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
        />
      ) : (
        <Text style={styles.noResults}>No songs found.</Text>
      )}
    </View>
  );
};

// Styles
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
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#457B9D",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
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
