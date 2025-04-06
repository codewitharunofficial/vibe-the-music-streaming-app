import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSong } from "@/context/SongContext";
import {
  getDownloadedSongs,
} from "@/constants/cachedData";
import { usePlayer } from "@/context/PlayerContext";
import { useUser } from "@/context/User";
import { TrackComponent } from "@/components/Component";

const Downloaded = () => {
  const { songUrl, setSongUrl } = useSong();
  const { setIsSongLoading } = useSong();
  const { setCurrentSong } = useSong();
  const [loading, setLoading] = useState(false);
  const { setCurrentQueue } = usePlayer();
  const [downloaded, setDownloaded] = useState([]);
  const { userInfo } = useUser();

  const { height } = Dimensions.get("window");

  const getSaved = async () => {
    const data = await getDownloadedSongs();
    setDownloaded(data);
  };

  useEffect(() => {
    getSaved();
  }, []);

  return (
    <View style={styles.container}>
      {/* Songs List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="white"
          style={{ marginTop: 20 }}
        />
      ) : downloaded.length > 0 ? (
        <FlatList
          data={downloaded}
          keyExtractor={(item) => item?.id.toString()}
          renderItem={({ item, index }) => (
            <TrackComponent
              item={item}
              songs={downloaded}
              setCurrentQueue={setCurrentQueue}
              setCurrentSong={setCurrentSong}
              setIsSongLoading={setIsSongLoading}
              setSongUrl={setSongUrl}
              index={index}
              userInfo={userInfo}
              onPress={() => {
                return null;
              }}
              playingFrom={"Downloaded"}
            />
          )}
          // contentContainerStyle={{ flexDirection: "column-reverse" }}
          scrollEnabled={true}
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Text style={styles.noResults}>No Downloaded Songs Found.</Text>
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
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#457B9D",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    justifyContent: "space-between",
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

export default Downloaded;
