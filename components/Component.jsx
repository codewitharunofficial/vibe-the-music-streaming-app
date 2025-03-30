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
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
  Entypo,
  AntDesign,
} from "@expo/vector-icons";
import { BottomModal, ModalContent, SlideAnimation } from "react-native-modals";
// import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { playSong, shareSong } from "@/constants/player";
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
  getFavourites,
  removeFromFavourites,
  saveToFavourites,
  saveToRecentlyPlayed,
} from "@/constants/cachedData";
import { fetchAndQueueNextTrack } from "@/trackPlayerUtils";
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
      onSwipeRelease={(event) => {
        console.log(event);
        if (event.layout.y >= 700) {
          onClose();
        }
      }}
    >
      <ModalContent style={styles.modalContainer}>
        <View style={styles.queueHeader}>
          <Text style={styles.title}>Queue</Text>
        </View>

        <FlatList
          data={queue}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => {
                playSong(
                  item,
                  setIsSongLoading,
                  setCurrentSong,
                  setSongUrl,
                  userInfo?.email
                );
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
                  console.log("Selected Song: ", item);
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
        song={currentSong}
        moveSong={moveSong}
        handleQueueSong={addToRNTPQueue}
      />
    </BottomModal>
  );
};

const NowPlayingScreen = ({
  song,
  isVisible,
  setIsVisible,
  isSongLoading,
  url,
}) => {
  const { isPlaying, setIsPlaying } = useSong();
  const { currentSong, setCurrentSong, setSongUrl, setIsSongLoading } =
    useSong();
  const { repeat, setRepeat, currentQueue } = usePlayer();
  const { userInfo, setUserInfo } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();
  const [favorites, setFavorites] = useState([]);
  // const isInitialLoad = useRef(true);

  // Handle PlaybackActiveTrackChanged
  useEffect(() => {
    const handleTrackChanged = async (data) => {
      console.log("PlaybackActiveTrackChanged:", data);

      if (!data.track) {
        console.log("Skipping initial load event");
        return;
      }

      const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeTrackIndex === undefined || !data.track) return;

      const activeTrack = await TrackPlayer.getTrack(activeTrackIndex);
      if (!activeTrack) return;

      const newSongIndex = currentQueue.findIndex(
        (s) => s.videoId === activeTrack.id
      );

      if (newSongIndex !== -1 && newSongIndex !== currentIndex) {
        setCurrentIndex(newSongIndex);
        setCurrentSong(currentQueue[newSongIndex]);
        setSongUrl(activeTrack.url);
        setIsPlaying(true);

        // Update recently played
        if (userInfo) {
          await handleRecentlyPlayed(
            userInfo.email,
            currentQueue[newSongIndex]
          );
        } else {
          await saveToRecentlyPlayed(currentQueue[newSongIndex]);
        }

        console.log("Switched to track:", currentQueue[newSongIndex].title);

        // Prefetch next track
        const nextIndex = newSongIndex + 1;
        if (nextIndex < currentQueue.length) {
          const nextTrack = currentQueue[nextIndex];
          const queue = await TrackPlayer.getQueue();
          const isNextInQueue = queue.some((t) => t.id === nextTrack.videoId);
          if (!isNextInQueue) {
            fetchAndQueueNextTrack(nextTrack, userInfo?.email);
          }
        }
      } else {
        console.log("Track ID not found in currentQueue:", activeTrack.id);
      }
    };

    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      handleTrackChanged
    );

    return () => subscription.remove();
  }, [currentQueue, currentIndex, userInfo]);

  // Handle PlaybackQueueEnded
  useEffect(() => {
    const handleQueueEnded = async () => {
      console.log("PlaybackQueueEnded");
      const queue = await TrackPlayer.getQueue();
      const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();

      if (repeat) {
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      } else if (activeTrackIndex < queue.length - 1) {
        console.log("RNTP will play the next track");
      } else if (currentIndex + 1 < currentQueue.length) {
        await loadMoreTracks(currentIndex + 1);
        await TrackPlayer.skipToNext();
      } else {
        setIsPlaying(false);
        setCurrentSong(null);
        setSongUrl(null);
        await TrackPlayer.reset();
      }
    };

    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      handleQueueEnded
    );

    return () => subscription.remove();
  }, [currentIndex, currentQueue, repeat]);

  // Sync currentIndex with currentSong
  useEffect(() => {
    if (currentQueue?.length > 0 && currentSong) {
      const index = currentQueue.findIndex(
        (s) => s.videoId === currentSong.videoId
      );
      if (index !== -1 && index !== currentIndex) setCurrentIndex(index);
    }
  }, [currentQueue, currentSong]);

  // Load and play audio when url changes
  useEffect(() => {
    if (url) loadAndPlayAudio();
  }, [url]);

  const loadAndPlayAudio = async () => {
    if (!url || !currentSong) return;

    try {
      setIsSongLoading(true);
      await TrackPlayer.reset();

      const track = {
        id: currentSong.videoId || "unknown-id",
        url: url,
        title: currentSong.title || "Now Playing",
        artist: currentSong.author || "Unknown Artist",
        artwork:
          currentSong.thumbnail?.url ||
          currentSong.thumbnail ||
          "https://via.placeholder.com/150",
      };

      await TrackPlayer.add(track);
      await TrackPlayer.play();
      setIsPlaying(true);

      // Prefetch next track
      const nextIndex = currentIndex + 1;
      if (nextIndex < currentQueue.length) {
        fetchAndQueueNextTrack(currentQueue[nextIndex], userInfo?.email);
      }
    } catch (error) {
      console.error("Error loading audio:", error);
    } finally {
      setIsSongLoading(false);
    }
  };

  const fetchAndQueueNextTrack = async (trackToQueue, email) => {
    try {
      const queue = await TrackPlayer.getQueue();
      if (queue.some((t) => t.id === trackToQueue.videoId)) {
        console.log("Next track already in queue:", trackToQueue.title);
        return;
      }

      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_API}/api/song`,
        { id: trackToQueue.videoId, song: trackToQueue, email }
      );

      if (data?.song) {
        const newTrack = {
          id: trackToQueue.videoId,
          url: data.song.adaptiveFormats[data.song.adaptiveFormats.length - 1]
            ?.url,
          title: trackToQueue.title,
          artist: trackToQueue.author,
          artwork: trackToQueue.thumbnail?.url || trackToQueue.thumbnail,
        };
        await TrackPlayer.add(newTrack);
        console.log("Queued next track:", newTrack.title);
      }
    } catch (error) {
      console.error("Error prefetching next track:", error);
    }
  };

  const loadMoreTracks = async (startIndex) => {
    // Implement logic to load more tracks into RNTP queue if needed
  };

  const playPause = async () => {
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause();
      setIsPlaying(false);
    } else {
      await TrackPlayer.play();
      setIsPlaying(true);
    }
  };

  const playNext = async () => {
    try {
      setIsSongLoading(true);
      if (currentIndex + 1 < currentQueue.length) {
        const nextTrack = currentQueue[currentIndex + 1];
        await playSong(nextTrack, setIsSongLoading, setCurrentSong, setSongUrl);
        setCurrentIndex(currentIndex + 1);
        setIsPlaying(true);
        if (userInfo) {
          await handleRecentlyPlayed(userInfo.email, nextTrack);
        } else {
          await saveToRecentlyPlayed(nextTrack);
        }
      } else {
        await TrackPlayer.reset();
        setIsPlaying(false);
        setCurrentSong(null);
        setSongUrl(null);
      }
    } catch (error) {
      console.error("Error playing next:", error);
    } finally {
      setIsSongLoading(false);
    }
  };

  const playPrev = async () => {
    try {
      setIsSongLoading(true);
      if (currentIndex > 0) {
        const prevTrack = currentQueue[currentIndex - 1];
        const url = await playSong(
          prevTrack,
          setIsSongLoading,
          setCurrentSong,
          setSongUrl
        );
        // setSongUrl(url);
        setCurrentIndex(currentIndex - 1);
        setIsPlaying(true);
        if (userInfo) {
          await handleRecentlyPlayed(userInfo.email, prevTrack);
        } else {
          await saveToRecentlyPlayed(prevTrack);
        }
      }
    } catch (error) {
      console.error("Error playing previous:", error);
    } finally {
      setIsSongLoading(false);
    }
  };

  const seekTo = async (value) => {
    await TrackPlayer.seekTo(value);
  };

  const toggleRepeat = async () => {
    const newRepeat = !repeat;
    await TrackPlayer.setRepeatMode(
      newRepeat ? RepeatMode.Queue : RepeatMode.Off
    );
    setRepeat(newRepeat);
  };

  const formatTime = (seconds) =>
    isNaN(seconds)
      ? "0:00"
      : `${Math.floor(seconds / 60)}:${String(
          Math.floor(seconds % 60)
        ).padStart(2, "0")}`;

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
    if(favorites.length === 0){
      getFav();
    }
  }, [userInfo, handleLike, favorites]);

  if (!song) return null;

  return (
    <BottomModal
      visible={isVisible}
      onTouchOutside={() => setIsVisible(false)}
      modalAnimation={new SlideAnimation({ slideFrom: "bottom" })}
      swipeDirection={["down"]}
      swipeThreshold={200}
      onSwipeRelease={(event) =>
        !showQueue && event.layout.y >= 500 && setIsVisible(false)
      }
      style={{ flex: 1 }}
    >
      <ModalContent
        style={[styles.fullScreenContainer, { paddingTop: height * 0.08 }]}
      >
        <Text style={styles.header}>Vibe - Now Playing</Text>
        <Image
          source={{ uri: song.thumbnail?.url || song.thumbnail }}
          style={styles.nowPlayingImage}
        />
        <Text style={styles.nowPlayingTitle}>{song.title?.slice(0, 30)}</Text>
        <Text style={styles.nowPlayingArtist}>{song.author?.slice(0, 30)}</Text>
        <View style={[styles.nowPlayingControls, { paddingHorizontal: 10 }]}>
          <TouchableOpacity
            style={[styles.shareButton, { margin: 10, alignItems: "center" }]}
            onPress={() => shareSong(currentSong)}
          >
            <AntDesign name="sharealt" size={24} color="#fff" />
          </TouchableOpacity>
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
            tapToSeek={true}
            onValueChange={seekTo}
            onSlidingComplete={seekTo}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.nowPlayingControls}>
          <TouchableOpacity onPress={toggleRepeat}>
            {repeat ? (
              <MaterialIcons name="repeat-one" size={32} color="#00ffcc" />
            ) : (
              <MaterialCommunityIcons name="repeat" size={32} color="#00F5D4" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={playPrev}>
            <Ionicons name="play-back" size={32} color="#00F5D4" />
          </TouchableOpacity>
          {isSongLoading || playbackState.state === State.Buffering ? (
            <ActivityIndicator size={32} color="white" />
          ) : (
            <TouchableOpacity onPress={playPause}>
              <Ionicons
                name={playbackState.state === State.Playing ? "pause" : "play"}
                size={32}
                color="#00F5D4"
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={playNext}>
            <Ionicons name="play-forward" size={32} color="#00F5D4" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowQueue(true)}>
            <MaterialCommunityIcons name="menu" size={32} color="#00F5D4" />
          </TouchableOpacity>
        </View>
      </ModalContent>
      <QueueModal
        isVisible={showQueue}
        onClose={setShowQueue}
        queue={currentQueue}
      />
    </BottomModal>
  );
};

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
      <Image source={{ uri: song.thumbnail }} style={styles.miniPlayerImage} />
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
        {!isSongLoading && playbackState.state !== State.Playing ? (
          <TouchableOpacity
            style={styles.miniPlayerIcon}
            onPress={async () => {
              await TrackPlayer.play();
              setIsPlaying(true);
            }}
          >
            <Ionicons name="play" size={24} color="white" />
          </TouchableOpacity>
        ) : !isSongLoading && playbackState.state === State.Playing ? (
          <TouchableOpacity
            style={styles.miniPlayerIcon}
            onPress={async () => {
              await TrackPlayer.pause();
              setIsPlaying(false);
            }}
          >
            <Ionicons name="pause" size={24} color="white" />
          </TouchableOpacity>
        ) : isSongLoading ||
          playbackState.state === State.Buffering ||
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
}) => {
  const { currentSong } = useSong();
  const [favorites, setFavorites] = useState([]);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentSong?.videoId === item?.videoId) {
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

  return (
    <TouchableOpacity
      onPress={async () => {
        console.log(index);
        setCurrentQueue(songs.slice(index, songs.length));
        if (!userInfo) {
          await saveToRecentlyPlayed(item);
        }
        await TrackPlayer.reset();
        await playSong(
          item,
          setIsSongLoading,
          setCurrentSong,
          setSongUrl,
          userInfo?.email
        );
      }}
      style={styles.trackItem}
    >
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
            {item.author?.slice(0, 20)}
          </Text>
        </View>
      </View>
      {currentSong?.videoId === item?.videoId && (
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
    backgroundColor: "#222",
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
