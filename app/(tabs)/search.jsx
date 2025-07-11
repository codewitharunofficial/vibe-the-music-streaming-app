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

    !token && setLoading(true);
    const options = {
      method: "GET",
      url: "https://youtube-music-api3.p.rapidapi.com/search",
      params: {
        q: query,
        type: "song",
        nextPage: token ? token : "",
      },
      headers: {
        "x-rapidapi-key": process.env.EXPO_PUBLIC_API_KEY_1,
        "x-rapidapi-host": process.env.EXPO_PUBLIC_API_HOST_1,
      },
    };

    try {
      const { data } = await axios.request(options);
      if (data?.result) {
        console.log(data);
        setSongs([...songs, ...data?.result]);
        data?.nextPageToken ? setToken(data?.nextPageToken) : setToken("");
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const footerItem = () => {
    return (
      <View
        style={{
          width: "100%",
          height: 60,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size={"large"} color="#fff" />
      </View>
    );
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
          placeholderTextColor="#AAA"
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
          keyExtractor={(item, index) => index?.toString()}
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
          onEndReached={fetchSongs}
          ListFooterComponent={token && footerItem}
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
    backgroundColor: "#2F1C6A",
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
    color: "white",
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
