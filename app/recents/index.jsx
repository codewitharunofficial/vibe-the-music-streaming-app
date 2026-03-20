import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from "react-native";
import { retrieveRecentlyPlayed } from "@/constants/apiCalls";
import { useSong } from "@/context/SongContext";
import { checkIfLoggedIn, getRecentlyPlayed } from "@/constants/cachedData";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@/context/User";
import Loader from "@/components/Loader";
import { TrackComponent } from "@/components/Component";

const SearchScreen = () => {
  const { songUrl, setSongUrl } = useSong();
  const { isSongLoading, setIsSongLoading } = useSong();
  const { currentSong, setCurrentSong } = useSong();
  const { open, setOpen } = useSong();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setCurrentQueue } = usePlayer();
  const { userInfo, setUserInfo } = useUser();

  const { height } = Dimensions.get("window");

  const fetchRecents = async () => {
    setLoading(true);
    await getRecentlyPlayed(setIsSongLoading, setSongs);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecents();
  }, []);

  return (
    <ImageBackground
      source={require("@/assets/images/background.jpg")}
      blurRadius={10}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* Songs List */}
        {loading ? (
          <Loader isLoading={loading} />
        ) : songs.length > 0 ? (
          <FlatList
            data={songs}
            keyExtractor={(item, index) => index}
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
                playingFrom={"Recents"}
              />
            )}
            contentContainerStyle={{ flexDirection: "column" }}
            scrollEnabled={true}
            alwaysBounceVertical
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.noResults}>No Recently Played Songs Found.</Text>
        )}
      </View>
    </ImageBackground>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 20,
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
    color: "#000",
    marginTop: 20,
    justifyContent: 'center',
    fontWeight: "bold",
    fontSize: 18
  },
});

export default SearchScreen;
