import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  ToastAndroid,
  ImageBackground,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
  Entypo,
  AntDesign,
  FontAwesome,
} from "@expo/vector-icons";
import { BottomModal, ModalContent, SlideAnimation } from "react-native-modals";
// import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { shareSong } from "@/constants/player";
import { useUser } from "@/context/User";
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  Event,
  State,
  RepeatMode,
} from "react-native-track-player";
import { updateServiceData } from "@/trackPlayerUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SongOptionsModal from "./OptionsOnNowPlaying";
import {
  checkIfDownloaded,
  downloadAndSaveSong,
  getDownloadedSongs,
  getFavourites,
  removeFromFavourites,
  saveToFavourites,
  saveToRecentlyPlayed,
} from "@/constants/cachedData";
import { handleLiked, handleRecentlyPlayed } from "@/constants/apiCalls";
import axios from "axios";
// import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");

// SongCard Component
const SongCard = ({
  song,
  onPlayPress,
  onLikePress,
  isPlaying,
  section,
  index,
}) => {
  return (
    <TouchableOpacity
      onPress={() => onPlayPress(section, song, index)}
      style={styles.cardContainer}
    >
      <Image source={{ uri: song.thumbnail }} style={styles.image} />
      <Text numberOfLines={1} style={styles.title}>
        {song.title?.slice(0, 30)}
      </Text>
      <Text numberOfLines={1} style={[styles.artist, { color: "#fff" }]}>
        {song.author?.slice(0, 30)}
      </Text>
      <View style={styles.iconContainer}></View>
    </TouchableOpacity>
  );
};

// SongsList Component
const SongsList = ({
  songs,
  title,
  onPlayPress,
  onLikePress,
  playingSongId,
  section,
}) => {
  return (
    <View style={styles.listContainer}>
      <Text style={styles.listTitle}>{title}</Text>
      <View style={styles.container}>
        <FlatList
          data={songs}
          renderItem={({ item, index }) => (
            <SongCard
              song={item}
              onPlayPress={onPlayPress}
              onLikePress={onLikePress}
              section={section}
              index={index}
            />
          )}
          keyExtractor={(item, index) => index}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

// QuickAccessButton Component
const QuickAccessButton = ({ title, iconName, onPress }) => {
  return (
    <TouchableOpacity style={styles.quickAccessButton} onPress={onPress}>
      <Feather name={iconName} size={28} color="white" />
      <Text style={styles.quickAccessText}>{title}</Text>
    </TouchableOpacity>
  );
};

const Section = ({ title, songs, onPlayPress, onLikePress, section }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <SongsList
        songs={songs}
        onPlayPress={onPlayPress}
        onLikePress={onLikePress}
        section={section}
      />
    </View>
  );
};

const formatTitle = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const MusicSections = ({ data, onPlayPress, onLikePress }) => {
  return (
    <FlatList
      data={Object.entries(data)}
      keyExtractor={([key]) => key.toString()}
      renderItem={({ item, index }) => {
        const [key, songs] = item;
        return key !== "charts" &&
          key !== "moods_and_moments" &&
          key !== "genres" ? (
          <Section
            title={formatTitle(key)}
            songs={songs}
            onPlayPress={onPlayPress}
            onLikePress={onLikePress}
            section={
              index !== 1
                ? key
                : index === 1 && key.includes("album")
                ? "album"
                : "playlist"
            }
          />
        ) : null;
      }}
    />
  );
};

const QueueModal = ({ isVisible, onClose, queue }) => {
  const { setIsSongLoading, currentSong, setCurrentSong, setSongUrl } =
    useSong();

  const [modalVisible, setModalVisible] = useState(false);

  const close = () => setModalVisible(false);

  const { userInfo } = useUser();
  const { currentIndex, setCurrentIndex } = usePlayer();
  const [selectedTrack, setSelectedTrack] = useState(null);

  function moveSong(arr, fromIndex, toIndex) {
    if (
      fromIndex < 0 ||
      fromIndex >= arr.length ||
      toIndex < 0 ||
      toIndex >= arr.length
    ) {
      console.error("Invalid indices");
      return arr;
    }

    const item = arr.splice(fromIndex, 1)[0];
    arr.splice(toIndex, 0, item);
    console.log(`The Song HAs been moved from ${fromIndex} to ${toIndex}`);
    return arr;
  }

  const addToRNTPQueue = async (song) => {
    try {
      console.log("Fetching next track:", song.title);

      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_API}/api/song`,
        {
          id: song.videoId,
          song: song,
          email: userInfo?.email,
        }
      );

      if (data) {
        console.log(
          data.song.adaptiveFormats[data.song.adaptiveFormats.length - 1]?.url
        );
        const newTrack = {
          id: song.videoId,
          url: data.song.adaptiveFormats[data.song.adaptiveFormats.length - 1]
            ?.url,
          title: song.title,
          artist: song.author,
          artwork:
            song.thumbnail?.url ||
            song.thumbnail ||
            "https://via.placeholder.com/150",
          thumbnail: song.thumbnail?.url || song.thumbnail,
        };

        console.log("Adding next track to queue:", newTrack.title);
        const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
        await TrackPlayer.add(newTrack, currentTrackIndex + 1);
      }
    } catch (error) {
      console.error("Error fetching next track:", error);
    }
  };

  return (
    <BottomModal
      visible={isVisible}
      style={{ width: width, height: height * 0.5 }}
      swipeDirection={["down"]}
      onSwipeRelease={() => {
        onClose();
      }}
    >
      <ModalContent style={styles.modalContainer}>
        <View style={styles.queueHeader}>
          <Text style={styles.title}>Queue</Text>
        </View>

        <FlatList
          data={queue}
          keyExtractor={(item, index) => index}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={async () => {
                await TrackPlayer.skip(index);
              }}
              style={styles.songItem}
            >
              <View style={{ flexDirection: "column" }}>
                <Text style={styles.songTitle}>{item.title?.slice(0, 20)}</Text>
                <Text style={styles.artist}>{item.author?.slice(0, 20)}</Text>
              </View>
              {item?.videoId === currentSong.videoId && (
                <MaterialIcons
                  name="equalizer"
                  size={24}
                  color={"#fff"}
                  style={{ position: "absolute", top: 20, right: 80 }}
                />
              )}
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(true);
                  setCurrentIndex(index);
                  setSelectedTrack(item);
                  // console.log("Selected Song: ", item);
                }}
                style={{ position: "absolute", top: 20, right: 10 }}
              >
                <Entypo name="dots-three-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </ModalContent>
      <SongOptionsModal
        isVisible={modalVisible}
        onClose={close}
        song={selectedTrack}
        moveSong={moveSong}
        handleQueueSong={addToRNTPQueue}
      />
    </BottomModal>
  );
};

const NowPlayingScreen = React.memo(
  ({ isVisible, setIsVisible, isSongLoading }) => {
    const {
      isPlaying,
      setIsPlaying,
      currentSong,
      setCurrentSong,
      setIsSongLoading,
    } = useSong();
    const { repeat, setRepeat, currentQueue, playingFrom } = usePlayer();
    const { userInfo } = useUser();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showQueue, setShowQueue] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const playbackState = usePlaybackState();
    const { position, duration } = useProgress(250);
    const isInitialMount = useRef(true);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgess] = useState(0);
    const [downloaded, setDownloaded] = useState([]);

    // 🎯 Handle Track Change and Sync UI
    const handleTrackChange = useCallback(async () => {
      try {
        const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeTrackIndex === undefined) return;

        const activeTrack = await TrackPlayer.getTrack(activeTrackIndex);
        if (!activeTrack) return;

        const newSongIndex = currentQueue.findIndex(
          (s) => s.videoId === activeTrack.id
        );

        if (newSongIndex !== -1 && newSongIndex !== currentIndex) {
          setCurrentIndex(newSongIndex);
          setCurrentSong(currentQueue[newSongIndex]);
          setIsPlaying(playbackState.state === State.Playing);
          updateService();
          await saveToRecentlyPlayed(currentQueue[newSongIndex]);
        }
      } catch (error) {
        console.error("Track change error:", error);
      }
    }, [currentQueue, currentIndex, playbackState.state]);

    // 🎯 Add Event Listeners for Track Change and Queue End
    useEffect(() => {
      if (isInitialMount.current) {
        handleTrackChange();
        isInitialMount.current = false;
      }

      const trackChangeListener = TrackPlayer.addEventListener(
        Event.PlaybackActiveTrackChanged,
        () => {
          console.log("Track changed, updating UI...");
          handleTrackChange();
        }
      );

      const queueEndListener = TrackPlayer.addEventListener(
        Event.PlaybackQueueEnded,
        async () => {
          console.log("Queue ended, resetting player...");
          await TrackPlayer.reset();
          setIsPlaying(false);
          setCurrentSong(null);
          setCurrentIndex(0);
          updateService();
        }
      );

      const errorListener = TrackPlayer.addEventListener(
        Event.PlaybackError,
        (error) => {
          console.error("Playback error:", error);
          ToastAndroid.show("Error playing song", ToastAndroid.SHORT);
        }
      );

      return () => {
        trackChangeListener.remove();
        queueEndListener.remove();
        errorListener.remove();
      };
    }, [handleTrackChange]);

    // 🎯 Update Service with Current Queue and Index
    const updateService = useCallback(() => {
      if (typeof updateServiceData === "function") {
        updateServiceData(currentQueue, userInfo, currentIndex);
      } else {
        console.error(
          "updateServiceData is not a function:",
          updateServiceData
        );
      }
    }, [currentQueue, userInfo, currentIndex]);

    useEffect(() => {
      updateService();
    }, [updateService]);

    // 🎯 Playback Controls
    const playPause = useCallback(async () => {
      try {
        if (playbackState.state === State.Playing) {
          await TrackPlayer.pause();
          setIsPlaying(false);
        } else {
          await TrackPlayer.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Play/pause error:", error);
      }
    }, [playbackState.state]);

    const playNext = useCallback(async () => {
      if (currentIndex + 1 >= currentQueue.length) {
        await TrackPlayer.reset();
        setIsPlaying(false);
        setCurrentSong(null);
        setCurrentIndex(0);
        return;
      }

      try {
        setIsSongLoading(true);
        const nextIndex = currentIndex + 1;
        await TrackPlayer.skip(nextIndex);
        await TrackPlayer.play();
        setCurrentIndex(nextIndex);
        setCurrentSong(currentQueue[nextIndex]);
        setIsPlaying(true);
        updateService();
        await saveToRecentlyPlayed(currentQueue[nextIndex]);
      } catch (error) {
        console.error("Next track error:", error);
      } finally {
        setIsSongLoading(false);
      }
    }, [currentIndex, currentQueue]);

    const playPrev = useCallback(async () => {
      if (currentIndex <= 0) return;

      try {
        setIsSongLoading(true);
        const prevIndex = currentIndex - 1;
        await TrackPlayer.skip(prevIndex);
        await TrackPlayer.play();
        setCurrentIndex(prevIndex);
        setCurrentSong(currentQueue[prevIndex]);
        setIsPlaying(true);
        updateService();
        await saveToRecentlyPlayed(currentQueue[prevIndex]);
      } catch (error) {
        console.error("Previous track error:", error);
      } finally {
        setIsSongLoading(false);
      }
    }, [currentIndex, currentQueue]);

    const seekTo = useCallback(async (value) => {
      try {
        await TrackPlayer.seekTo(value);
      } catch (error) {
        console.error("Seek error:", error);
      }
    }, []);

    const toggleRepeat = useCallback(async () => {
      try {
        const newRepeat = !repeat;
        await TrackPlayer.setRepeatMode(
          newRepeat ? RepeatMode.Queue : RepeatMode.Off
        );
        setRepeat(newRepeat);
      } catch (error) {
        console.error("Repeat toggle error:", error);
      }
    }, [repeat]);

    const formatTime = useCallback((seconds) => {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }, []);

    const handleLike = async () => {
      if (!userInfo) {
        Alert.alert("Error!", "Please Sign In To Add Tracks to Favourites");
        return;
      }

      try {
        const fav = await getFavourites();
        if (fav.find((item) => item.videoId === currentSong.videoId)) {
          const newFav = await removeFromFavourites(currentSong);
          setFavorites(newFav);
          const data = await handleLiked(userInfo?.email, currentSong);
          console.log(data);
          ToastAndroid.show("Removed from Favourites", ToastAndroid.SHORT);
        } else {
          ToastAndroid.show("Adding Song To Favourites", ToastAndroid.SHORT);
          fav.push(currentSong);
          await saveToFavourites(fav);
          setFavorites(fav);
          const data = await handleLiked(userInfo?.email, currentSong);
          setFavorites(data.favourites);
          await saveToFavourites(data.favourites);
          ToastAndroid.show("Added To Favourites", ToastAndroid.SHORT);
        }
      } catch (error) {
        console.error("Error handling like:", error);
        ToastAndroid.show("Error updating favourites", ToastAndroid.SHORT);
      }
    };

    // 🎯 Fetch Favorites
    const getFav = async () => {
      if (userInfo) {
        const data = await getFavourites();
        setFavorites(data);
      }
    };

    useEffect(() => {
      if (favorites.length === 0) {
        getFav();
      }
    }, [userInfo, handleLike]);

    const getSaved = async () => {
      const data = await getDownloadedSongs();
      setDownloaded(data);
    };

    useEffect(() => {
      getSaved();
    }, [downloadAndSaveSong, currentSong, handleTrackChange]);

    if (!currentSong) return null;

    return (
      <BottomModal
        visible={isVisible}
        onTouchOutside={() => setIsVisible(false)}
        modalAnimation={new SlideAnimation({ slideFrom: "bottom" })}
        swipeDirection={["down"]}
        swipeThreshold={200}
        onSwipeRelease={() => !showQueue && setIsVisible(false)}
      >
        <ImageBackground
          source={{
            uri:
              currentSong.thumbnail?.url ||
              currentSong.thumbnail ||
              currentSong.artwork,
          }}
          style={{ height: height * 0.93, paddingTop: 50, padding: 10 }}
          blurRadius={10} // Apply blur effect
          resizeMode="cover"
        >
          <Text
            style={[styles.header, { fontSize: 14, marginBottom: 10 }]}
          >{`Playing From ${playingFrom}`}</Text>

          <Text style={styles.header}>Vibe - Now Playing</Text>
          <Image
            source={{
              uri:
                currentSong.thumbnail?.url ||
                currentSong.thumbnail ||
                currentSong.artwork,
            }}
            style={styles.nowPlayingImage}
            resizeMode="cover"
          />
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {currentSong.title?.slice(0, 30) || "Unknown Title"}
          </Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {currentSong.author?.slice(0, 30) ||
              currentSong.artist?.slice(0, 30) ||
              "Unknown Artist"}
          </Text>
          <View style={[styles.nowPlayingControls, { paddingHorizontal: 10 }]}>
            <TouchableOpacity
              style={[styles.shareButton, { margin: 10, alignItems: "center" }]}
              onPress={() => shareSong(currentSong)}
            >
              <AntDesign name="sharealt" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.nowPlayingControls}>
              <TouchableOpacity
                disabled={isDownloading || isDownloaded}
                style={[
                  styles.shareButton,
                  { margin: 10, alignItems: "center" },
                ]}
                onPress={async () => {
                  setIsDownloading(true);
                  await downloadAndSaveSong(currentSong, setDownloadProgess);
                  setIsDownloading(false);
                  setIsDownloaded(true);
                }}
              >
                {isDownloading ? (
                  <View
                    style={{
                      alignItems: "center",
                      padding: 8,
                      borderRadius: 50,
                      borderWidth: 0.5,
                      borderColor: "white",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "white" }}>
                      {downloadProgress}%
                    </Text>
                  </View>
                ) : downloaded.find(
                    (s) => s.id === (currentSong.id || currentSong.videoId)
                  ) ? (
                  <FontAwesome name="check-circle" size={24} color={"green"} />
                ) : (
                  <Feather name="download" size={24} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.miniPlayerIcon}
                onPress={handleLike}
              >
                {favorites.find(
                  (item) => item.videoId === currentSong?.videoId
                ) ? (
                  <Ionicons name="heart" size={24} color="#FF4D67" />
                ) : (
                  <Ionicons name="heart-outline" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration || 1}
              value={position}
              minimumTrackTintColor="#FF9F1C"
              maximumTrackTintColor="#FFFFFF"
              thumbTintColor="#FF9F1C"
              tapToSeek={true}
              onValueChange={seekTo}
              onSlidingComplete={seekTo}
              disabled={isSongLoading}
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
          <View style={styles.nowPlayingControls}>
            <TouchableOpacity onPress={toggleRepeat}>
              {repeat ? (
                <MaterialIcons name="repeat-one" size={32} color="#00ffcc" />
              ) : (
                <MaterialCommunityIcons
                  name="repeat"
                  size={32}
                  color="#00F5D4"
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={playPrev} disabled={currentIndex <= 0}>
              <Ionicons
                name="play-back"
                size={32}
                color={currentIndex <= 0 ? "#666" : "#00F5D4"}
              />
            </TouchableOpacity>
            {isSongLoading || playbackState.state === State.Buffering ? (
              <ActivityIndicator size={32} color="white" />
            ) : (
              <TouchableOpacity onPress={playPause}>
                <Ionicons
                  name={
                    playbackState.state === State.Playing ? "pause" : "play"
                  }
                  size={32}
                  color="#00F5D4"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={playNext}
              disabled={currentIndex + 1 >= currentQueue.length}
            >
              <Ionicons
                name="play-forward"
                size={32}
                color={
                  currentIndex + 1 >= currentQueue.length ? "#666" : "#00F5D4"
                }
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQueue(true)}>
              <MaterialCommunityIcons name="menu" size={32} color="#00F5D4" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <QueueModal
          isVisible={showQueue}
          onClose={setShowQueue}
          queue={currentQueue}
        />
      </BottomModal>
    );
  }
);

// export default NowPlayingScreen;

const MiniPlayer = ({
  song,
  onOpen,
  isSongLoading,
  isPlaying,
  setIsPlaying,
  route,
}) => {
  const playbackState = usePlaybackState();
  const { userInfo } = useUser();
  const { currentSong } = useSong();
  const [favorites, setFavorites] = useState([]);

  const handleLike = async () => {
    if (!userInfo) {
      Alert.alert("Error!", "Please Sign In To Add Tracks to Favourites");
    } else {
      const fav = await getFavourites();
      if (fav.find((item) => item.videoId === currentSong.videoId)) {
        const newFav = await removeFromFavourites(currentSong);
        setFavorites(newFav);
        const data = await handleLiked(userInfo?.email, currentSong);
        console.log(data);
      } else {
        fav.push(currentSong);
        await saveToFavourites(fav);
        const data = await handleLiked(userInfo?.email, currentSong);
        setFavorites(fav);
        await saveToFavourites(data.favourites);
      }
    }
  };

  const getFav = async () => {
    if (userInfo) {
      const data = await getFavourites();
      setFavorites(data);
    }
  };

  useEffect(() => {
    getFav();
  }, [userInfo, handleLike]);

  if (!song) return null;

  return (
    <TouchableOpacity
      onPress={() => onOpen(true)}
      style={[
        styles.miniPlayerContainer,
        { bottom: route === "(tabs)" ? height * 0.098 : 1 },
      ]}
    >
      <Image
        source={{ uri: song.thumbnail || song.artwork }}
        style={styles.miniPlayerImage}
      />
      <View style={styles.miniPlayerInfo}>
        <Text numberOfLines={1} style={[styles.miniPlayerTitle]}>
          {song.title?.slice(0, 30)}
        </Text>
        <Text numberOfLines={1} style={styles.miniPlayerArtist}>
          {song.author?.slice(0, 30)}
        </Text>
      </View>
      <View
        style={{ flexDirection: "row", gap: 10, marginLeft: 10, flex: 0.2 }}
      >
        <TouchableOpacity
          style={styles.miniPlayerIcon}
          onPress={async () => {
            handleLike();
          }}
        >
          {favorites.find((item) => item.videoId === currentSong.videoId) ? (
            <Ionicons name="heart" size={24} color={"#FF4D67"} />
          ) : (
            <Ionicons name="heart-outline" size={24} color={"#fff"} />
          )}
        </TouchableOpacity>
        {playbackState.state !== State.Playing ? (
          <TouchableOpacity
            style={styles.miniPlayerIcon}
            onPress={async () => {
              await TrackPlayer.play();
              setIsPlaying(true);
            }}
          >
            <Ionicons name="play" size={24} color="white" />
          </TouchableOpacity>
        ) : playbackState.state === State.Playing ? (
          <TouchableOpacity
            style={styles.miniPlayerIcon}
            onPress={async () => {
              await TrackPlayer.pause();
              setIsPlaying(false);
            }}
          >
            <Ionicons name="pause" size={24} color="white" />
          </TouchableOpacity>
        ) : playbackState.state === State.Buffering ||
          playbackState.state === State.Loading ? (
          <ActivityIndicator
            size={24}
            color={"white"}
            style={styles.miniPlayerIcon}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const TrackComponent = ({
  item,
  setCurrentQueue,
  setIsSongLoading,
  setCurrentSong,
  setSongUrl,
  songs,
  userInfo,
  index,
  onPress,
  playingFrom,
}) => {
  const { currentSong } = useSong();
  const [favorites, setFavorites] = useState([]);
  const { isPlaying, setIsPlaying, setPlayingFrom } = usePlayer();

  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (
      (currentSong?.videoId || currentSong?.id) === (item?.videoId || item?.id)
    ) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000, // Adjust speed of rotation
          easing: Easing.linear, // Smooth infinite rotation
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0); // Reset rotation when not playing
    }
  }, [currentSong]);

  // Interpolating rotation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getFav = async () => {
    const fav = JSON.parse(await AsyncStorage.getItem("favourites")) || [];
    const song = fav.find((e) => e.videoId === item.videoId);
    if (song) {
      const indexToremove = fav.findIndex((e) => e.videoId === item.videoId);
      fav.splice(indexToremove, 1);
      setFavorites(fav);
    }
    const data = await getFavourites();
    if (data) {
      setFavorites(data);
    }
  };

  useEffect(() => {
    if (favorites.length < 1) {
      getFav();
    }
  }, [currentSong, favorites]);

  const play = async () => {
    try {
      await TrackPlayer.reset();
      setCurrentSong(item);
      setPlayingFrom(playingFrom);
      await saveToRecentlyPlayed(item);

      if (userInfo) {
        await handleRecentlyPlayed(userInfo?.email, item);
      }

      const newQueue = songs.slice(index, songs.length);
      setCurrentQueue(newQueue);

      const tracks = newQueue.map((s) => ({
        id: s.videoId,
        url: s?.uri || `${process.env.EXPO_PUBLIC_STREAM_URL}/play?videoId=${
          s.videoId
        }&email=${userInfo?.email || ""}`,
        title: s.title || "Unknown Title",
        artist: s.author || "Unknown Artist",
        artwork: s.thumbnail?.url || s.thumbnail,
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

  // console.log("Current Song: ", currentSong);

  return (
    <TouchableOpacity onPress={async () => play()} style={styles.trackItem}>
      <View style={{ flexDirection: "row", flex: 0.8 }}>
        <Image
          source={{ uri: item?.thumbnail[0]?.url || item.thumbnail }}
          style={styles.trackImage}
        />
        <View style={styles.trackDetails}>
          <Text numberOfLines={1} style={styles.trackTitle}>
            {item.title?.slice(0, 20)}...
          </Text>
          <Text numberOfLines={1} style={styles.trackArtist}>
            {item.author?.slice(0, 20) || item.artist?.slice(0, 20) || "Unknown"}
          </Text>
        </View>
      </View>
      {(currentSong?.id || currentSong?.videoId) ===
        (item?.videoId || item?.id) && (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <FontAwesome5 name="compact-disc" size={24} color={"#181A3Aff"} />
        </Animated.View>
      )}
      <TouchableOpacity
        onPress={async () => onPress(item)}
        style={{ marginRight: 10 }}
      >
        {favorites.find((song) => song.videoId === item.videoId) && (
          <Ionicons name="heart" size={24} color={"#FF4D67"} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    width: 150,
    height: 250,
    marginHorizontal: 10,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    // marginTop: 5,
  },
  artist: {
    fontSize: 12,
    color: "gray",
    textAlign: "center",
  },
  iconContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  iconButton: {
    marginHorizontal: 5,
  },
  listContainer: {
    marginVertical: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FF4C98",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
  container: {
    paddingVertical: 10,
  },
  quickAccessButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2c2c2e",
    padding: width * 0.04,
    borderRadius: 8,
    marginVertical: width * 0.02,
    minWidth: width * 0.45,
    alignSelf: "center",
  },
  quickAccessText: {
    color: "white",
    fontSize: width * 0.04,
    marginLeft: width * 0.03,
  },
  sectionContainer: {
    padding: width * 0.04,
  },
  sectionTitle: {
    color: "white",
    fontSize: width * 0.05,
    fontWeight: "bold",
    marginBottom: width * 0.02,
  },
  fullScreenContainer: {
    width: width,
    height: height * 0.93,
    backgroundColor: "#2F1C6A",
    padding: 20,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  shareText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 16,
  },
  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  nowPlayingImage: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    objectFit: "fill",
  },
  nowPlayingTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 5,
  },
  nowPlayingArtist: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    width: 40,
    textAlign: "center",
  },
  nowPlayingControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  miniPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A86FF",
    padding: 10,
    borderRadius: 10,
    position: "absolute",
    bottom: height * 0.098,
    left: 10,
    right: 10,
    gap: 5,
  },
  miniPlayerImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  miniPlayerInfo: {
    flex: 0.75,
    marginLeft: 10,
  },
  miniPlayerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  miniPlayerArtist: {
    color: "#BFC0C0",
    fontSize: 14,
  },
  miniPlayerIcon: {
    margin: "auto",
  },
  modalContainer: {
    height: height * 0.5,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  queueHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#555",
    paddingBottom: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  songItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  songTitle: {
    fontSize: 16,
    color: "#fff",
  },
  artist: {
    fontSize: 14,
    color: "#aaa",
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#457B9D",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    justifyContent: "space-between",
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  trackTitle: {
    width: "100%",
    fontSize: 16,
    color: "#fff",
  },
  trackArtist: {
    fontSize: 14,
    color: "#bbb",
  },
  trackDetails: {
    marginLeft: 15,
  },
});

export {
  SongCard,
  SongsList,
  QuickAccessButton,
  Section,
  MusicSections,
  NowPlayingScreen,
  MiniPlayer,
  QueueModal,
  TrackComponent,
};
