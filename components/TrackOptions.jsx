import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  Dimensions,
  ToastAndroid,
} from "react-native";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useUser } from "@/context/User";
import TrackPlayer from "react-native-track-player";
import ModalBase from "react-native-modal";
import { handleAddToPlaylist } from "@/constants/apiCalls";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { shareSong } from "@/constants/player";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSegments } from "expo-router";
import { getFavourites, handleLike } from "@/constants/cachedData";

const TrackOptionModal = ({ isVisible, onClose, song, moveSong, from }) => {
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const { userPlaylist, setUserPlaylist } = useUser();
  const { userInfo } = useUser();
  const [isAddingSong, setIsAddingSong] = useState(false);
  const { currentQueue, setCurrentQueue } = usePlayer();
  const { currentIndex, setCurrentIndex } = usePlayer();
  const { currentSong, setCurrentSong } = useSong();
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [favourites, setFavorites] = useState([]);

  const { width, height } = Dimensions.get("window");

  const handleRemove = async (index) => {
    const queue = currentQueue;
    queue.splice(index, 1);
    setCurrentQueue(queue);
    onClose();
  };

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (userInfo) {
        const playlists =
          JSON.parse(await AsyncStorage.getItem("user-playlists")) || [];
        if (playlists.length > 0) {
          setUserPlaylist(playlists);
        }
      }
    };

    fetchPlaylists();
  }, [userInfo]);

  return (
    <>
      <ModalBase
        isVisible={isVisible}
        onBackdropPress={onClose}
        backdropOpacity={0.4}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Options</Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={async () => {
              const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
              console.log("Current Track Index: ", currentTrackIndex);
              const queue = await TrackPlayer.getQueue();

              const indexToMoveFrom = queue.findIndex(
                (s) => s.id === song.videoId
              );

              console.log("Move From: ", indexToMoveFrom);

              if (indexToMoveFrom !== -1) {
                console.log(
                  `Moving Track from ${indexToMoveFrom} to ${
                    currentTrackIndex + 1
                  }`
                );
                const arr = moveSong(
                  currentQueue,
                  indexToMoveFrom,
                  currentTrackIndex + 1
                );
                setCurrentQueue(arr);
                onClose();
                await TrackPlayer.move(indexToMoveFrom, currentTrackIndex + 1);
              }
            }}
            disabled={currentQueue?.length < 1}
          >
            <MaterialIcons name="next-plan" size={24} color="white" />
            <Text style={styles.optionText}>Play Next In queue</Text>
          </TouchableOpacity>

          {currentQueue.find(
            (track) =>
              (track.id || track.videoId) === (song?.id || song?.videoId)
          ) ? (
            <TouchableOpacity
              style={styles.optionButton}
              onPress={async () => {
                const queue = await TrackPlayer.getQueue();

                const indexToremove = queue.findIndex(
                  (s) => s.id === song.videoId
                );
                await TrackPlayer.remove(indexToremove);
                handleRemove(indexToremove);
                ToastAndroid.show("Song Removed From The Queue");
              }}
            >
              <Ionicons name="remove" size={24} color="white" />
              <Text style={styles.optionText}>Remove From Queue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.optionButton}
              onPress={async () => {
                await TrackPlayer.add(song);
                setCurrentQueue([...currentQueue, song]);
                ToastAndroid.show("Song Added To The Queue", 2000);
              }}
              disabled={currentQueue.length < 1}
            >
              <Ionicons name="add" size={24} color="white" />
              <Text style={styles.optionText}>Add To Queue</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => setPlaylistModalVisible(true)}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.optionText}>Add to Playlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              handleLike(userInfo, setFavorites, song);
              setPlaylistModalVisible(false);
            }}
          >
            {!getFavourites().then((fav) =>
              fav?.find(
                (item) =>
                  (item?.id || item?.videoId) === song?.id || song?.videoId
              )
            ) ? (
              <>
                <Ionicons name="heart-outline" size={24} color={"#fff"} />
                <Text style={styles.optionText}>Add To Favourites</Text>
              </>
            ) : (
              <>
                <Ionicons name="heart" size={24} color={"#FF4D67"} />
                <Text style={styles.optionText}>Remove From Favourites</Text>
              </>
            )}
          </TouchableOpacity>

          {!useSegments().includes("local") && (
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => shareSong(song)}
            >
              <AntDesign name="sharealt" size={24} color="white" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>

      <ModalBase
        isVisible={isPlaylistModalVisible}
        onBackdropPress={() => setPlaylistModalVisible(false)}
        backdropOpacity={0.4}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Playlist</Text>
          <FlatList
            data={userPlaylist}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionButton, { width: width }]}
                onPress={async () => {
                  setIsAddingSong(true);
                  setSelectedPlaylist(item.name);
                  await handleAddToPlaylist(item?._id, song);
                  setIsAddingSong(false);
                  setPlaylistModalVisible(false);
                  onClose();
                }}
              >
                <Image
                  source={{ uri: item.poster || item.songs[0].thumbnail }}
                  style={{ width: 50, height: 50, borderRadius: 50 }}
                />

                <Text style={styles.optionText}>{item.name}</Text>
                {isAddingSong && item.name === selectedPlaylist ? (
                  <ActivityIndicator
                    size={"large"}
                    color={"green"}
                    style={{ position: "absolute", right: 100 }}
                  />
                ) : null}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPlaylistModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ModalBase>
    </>
  );
};

export default TrackOptionModal;

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#292929",
    marginVertical: 5,
  },
  optionText: {
    fontSize: 16,
    color: "white",
    marginLeft: 10,
  },
  closeButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ff4444",
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
});
