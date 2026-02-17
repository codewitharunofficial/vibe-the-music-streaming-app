import React, { useEffect, useRef, useState, useCallback } from "react";
import { sp, wp, hp, fs } from "@/utils/responsive";
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
  handleLike,
  removeFromFavourites,
  saveToFavourites,
  saveToRecentlyPlayed,
} from "@/constants/cachedData";
import { handleLiked, handleRecentlyPlayed } from "@/constants/apiCalls";
import axios from "axios";
import Colors from "@/constants/Colors";

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
      <Image
        source={{
          uri: song?.songs?.thumbnail || song?.thumbnail || song?.poster,
        }}
        style={styles.image}
      />
      <Text numberOfLines={1} style={styles.title}>
        {song.title?.slice(0, 30) || song?.name}
      </Text>
      {song?.author ? (
        <Text numberOfLines={1} style={[styles.artist, { color: "#fff" }]}>
          {song.author?.slice(0, 30)}
        </Text>
      ) : (
        song?.type === "Public" &&
        section === "custom_playlists" && (
          <Text numberOfLines={1} style={[styles.artist, { color: "#fff" }]}>
            {"Arun"}
          </Text>
        )
      )}
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
  const flatListRef = useRef(null);

  useEffect(() => {
    TrackPlayer.getActiveTrackIndex().then((index) => {
      setCurrentIndex(index); // Update context/state
      // if (index !== -1 && flatListRef.current) {
      //   flatListRef.current.scrollToIndex({
      //     index,
      //     animated: true,
      //     viewPosition: 0.5,
      //   });
      // }
    });
  }, [isVisible, currentIndex]);

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
        },
      );

      if (data) {
        console.log(
          data.song.adaptiveFormats[data.song.adaptiveFormats.length - 1]?.url,
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
      onTouchOutside={() => console.log("Touched Outside")}
      visible={isVisible}
      style={{ width: width, height: height * 0.5 }}
      swipeDirection={["down"]}
      swipeThreshold={1000}
      onSwipeRelease={() => {
        onClose();
      }}
    >
      <ModalContent
        style={{
          height: height * 0.5,
          paddingTop: 20,
          padding: 10,
          backgroundColor: "#2F1C6A",
        }}
      >
        <View style={styles.queueHeader}>
          <Text style={styles.title}>Current Queue</Text>
        </View>

        <FlatList
          ref={flatListRef}
          initialScrollIndex={currentIndex}
          data={queue}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
          keyExtractor={(item) =>
            item?.videoId?.toString() || item?.id?.toString()
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={async () => {
                await TrackPlayer.skip(index);
              }}
              style={styles.songItem}
            >
              <Image
                source={{
                  uri:
                    item.thumbnail?.url ||
                    item.thumbnail ||
                    item.artwork ||
                    "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
                }}
                style={{ height: 50, width: 50, padding: 10, borderRadius: 10 }}
              />
              <View style={{ flexDirection: "column" }}>
                <Text style={styles.songTitle}>{item.title?.slice(0, 20)}</Text>
                <Text style={styles.artist}>{item.author?.slice(0, 20)}</Text>
              </View>
              {(item?.videoId || item.id) ===
                (currentSong.videoId || currentSong.id) && (
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
    const [currentDownload, setCurrentDownload] = useState(null);

    // Handle Track Change and Sync UI
    const handleTrackChange = useCallback(async () => {
      try {
        const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeTrackIndex === undefined) return;

        const activeTrack = await TrackPlayer.getTrack(activeTrackIndex);
        if (!activeTrack) return;

        const newSongIndex = currentQueue.findIndex(
          (s) => (s.videoId || s.id) === activeTrack.id,
        );

        console.log("New song Index: ", newSongIndex);

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

    // Add Event Listeners for Track Change and Queue End
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
        },
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
        },
      );

      const errorListener = TrackPlayer.addEventListener(
        Event.PlaybackError,
        (error) => {
          console.error("Playback error:", error);
          ToastAndroid.show("Error playing song", ToastAndroid.SHORT);
        },
      );

      return () => {
        trackChangeListener.remove();
        queueEndListener.remove();
        errorListener.remove();
      };
    }, [handleTrackChange]);

    //  Update Service with Current Queue and Index
    const updateService = useCallback(() => {
      if (typeof updateServiceData === "function") {
        updateServiceData(currentQueue, userInfo, currentIndex);
      } else {
        console.error(
          "updateServiceData is not a function:",
          updateServiceData,
        );
      }
    }, [currentQueue, userInfo, currentIndex]);

    useEffect(() => {
      updateService();
    }, [updateService]);

    //  Playback Controls
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
          newRepeat ? RepeatMode.Track : RepeatMode.Off,
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

    // Fetch Favorites
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
    }, [downloadAndSaveSong, currentSong, handleTrackChange, currentDownload]);

    if (!currentSong) return null;

    return (
      <BottomModal
        visible={isVisible}
        modalAnimation={new SlideAnimation({ slideFrom: "bottom" })}
        swipeDirection={["down"]}
        swipeThreshold={1000}
        onTouchOutside={() => {
          console.log("Touched Outside");
        }}
        onSwipeRelease={() => !showQueue && setIsVisible(false)}
        onHardwareBackPress={() => setIsVisible(!!isVisible)}
      >
        <ImageBackground
          source={{
            uri:
              currentSong.thumbnail?.url ||
              currentSong.thumbnail ||
              currentSong.artwork ||
              "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
          }}
          style={{ height: height * 0.93, paddingTop: 50, padding: 10 }}
          blurRadius={10}
          resizeMode="cover"
        >
          <Text
            style={[
              styles.header,
              { fontSize: 14, marginBottom: 10, backfaceVisibility: "visible" },
            ]}
          >{`Playing From ${playingFrom}`}</Text>

          <Text style={styles.header}>Vibe - Now Playing</Text>
          <Image
            source={{
              uri:
                currentSong.thumbnail?.url ||
                currentSong.thumbnail ||
                currentSong.artwork ||
                "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
            }}
            style={styles.nowPlayingImage}
            resizeMode="cover"
          />
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {currentSong.title || "Unknown Title"}
          </Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {currentSong.author || currentSong.artist || "Unknown Artist"}
          </Text>
          {playingFrom !== "Local" && (
            <View
              style={[styles.nowPlayingControls, { paddingHorizontal: 10 }]}
            >
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { margin: 10, alignItems: "center" },
                ]}
                onPress={() => shareSong(currentSong)}
              >
                <AntDesign name="sharealt" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.nowPlayingControls}>
                <TouchableOpacity
                  disabled={
                    (isDownloading || isDownloaded) &&
                    (currentDownload?.id || currentDownload?.videoId) ===
                      (currentSong?.id || currentSong?.videoId)
                  }
                  style={[
                    styles.shareButton,
                    { margin: 10, alignItems: "center" },
                  ]}
                  onPress={async () => {
                    setIsDownloading(true);
                    await downloadAndSaveSong(
                      currentSong,
                      setDownloadProgess,
                      setCurrentDownload,
                    );
                    ToastAndroid.show("Song Downloaded", ToastAndroid.SHORT);
                    setIsDownloading(false);
                    setIsDownloaded(true);
                  }}
                >
                  {isDownloading &&
                  (currentDownload?.id || currentDownload?.videoId) ===
                    (currentSong?.id || currentSong?.videoId) ? (
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
                      (s) => s.id === (currentSong.id || currentSong.videoId),
                    ) ? (
                    <FontAwesome
                      name="check-circle"
                      size={25}
                      color={"green"}
                      style={{ alignSelf: "center" }}
                    />
                  ) : (
                    <Feather name="download" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.miniPlayerIcon}
                  onPress={() =>
                    handleLike(userInfo, setFavorites, currentSong)
                  }
                >
                  {favorites.find(
                    (item) =>
                      (item.videoId || item?.id) ===
                      (currentSong?.videoId || currentSong.id),
                  ) ? (
                    <Ionicons name="heart" size={24} color="#FF4D67" />
                  ) : (
                    <Ionicons name="heart-outline" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
                <MaterialIcons
                  name="repeat-one"
                  size={32}
                  color={COLORS.textPrimary}
                />
              ) : (
                <MaterialCommunityIcons
                  name="repeat"
                  size={32}
                  color={COLORS.textPrimary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={playPrev} disabled={currentIndex <= 0}>
              <Ionicons
                name="play-back"
                size={32}
                color={currentIndex <= 0 ? "#666" : COLORS.textPrimary}
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
                  color={COLORS.textPrimary}
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
                  currentIndex + 1 >= currentQueue.length
                    ? "#666"
                    : COLORS.textPrimary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQueue(true)}>
              <MaterialCommunityIcons
                name="menu"
                size={32}
                color={COLORS.textPrimary}
              />
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
  },
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
        source={{
          uri:
            song.thumbnail ||
            song.artwork ||
            "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
        }}
        style={styles.miniPlayerImage}
      />
      <View style={styles.miniPlayerInfo}>
        <Text numberOfLines={1} style={[styles.miniPlayerTitle]}>
          {song.title?.slice(0, 30)}
        </Text>
        <Text numberOfLines={1} style={styles.miniPlayerArtist}>
          {song.author?.slice(0, 30) || song.artist?.slice(0, 30)}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: wp(10),
          marginLeft: wp(10),
          flex: wp(0.3),
        }}
      >
        <TouchableOpacity
          style={styles.miniPlayerIcon}
          onPress={async () => {
            handleLike();
          }}
        >
          {favorites.find(
            (item) =>
              (item.videoId || item.id) ===
              (currentSong.videoId || currentSong.id),
          ) ? (
            <Ionicons name="heart" size={24} color={"#FF4D67"} />
          ) : (
            <Ionicons name="heart-outline" size={24} color={"#fff"} />
          )}
        </TouchableOpacity>
        {isSongLoading || playbackState.state === State.Buffering ? (
          <ActivityIndicator size={24} color="white" />
        ) : (
          <TouchableOpacity onPress={playPause}>
            <Ionicons
              name={playbackState.state === State.Playing ? "pause" : "play"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        )}
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
  const { currentSong, setIsModalOpen, setSelectedTrack } = useSong();
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
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [currentSong, item]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getFav = async () => {
    try {
      const fav = JSON.parse(await AsyncStorage.getItem("favourites")) || [];
      const song = fav.find(
        (e) => (e.videoId || e.id) === (item.videoId || item.id),
      );
      if (song) {
        const indexToremove = fav.findIndex(
          (e) => (e.videoId || e.id) === (item.videoId || item.id),
        );
        fav.splice(indexToremove, 1);
        setFavorites(fav);
      }
      const data = await getFavourites();
      if (data) {
        setFavorites(data);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  useEffect(() => {
    if (favorites.length < 1) {
      getFav();
    }
  }, [currentSong, favorites]);

  const play = async () => {
    try {
      setIsSongLoading(true);

      await TrackPlayer.reset();

      const makeTrack = (s) => ({
        id: s.videoId || s.id,
        url:
          s.uri ||
          `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${
            s.videoId || s.id
          }&email=${userInfo?.email || ""}`,
        title: s.title || s.filename || "Unknown Title",
        artist: s.author || s.artist || "Unknown Artist",
        artwork:
          s.thumbnail?.url ||
          s.thumbnail ||
          s.artwork ||
          "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",

        // 🔥 ANDROID-CRITICAL
        type: "audio/mp4",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 13)",
          Accept: "*/*",
          Range: "bytes=0-",
        },
      });

      // Build queue FIRST
      const newQueue = songs.slice(index);
      const tracks = newQueue.map(makeTrack);

      await TrackPlayer.setQueue(tracks);

      await TrackPlayer.skip(0);
      await TrackPlayer.play();

      setCurrentSong(tracks[0]);
      setCurrentQueue(newQueue);
      setIsPlaying(true);
      setIsSongLoading(false);

      await saveToRecentlyPlayed(item);

      if (userInfo?.email) {
        await handleRecentlyPlayed(userInfo.email, item);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setIsSongLoading(false);
      ToastAndroid.show("Error playing song", ToastAndroid.SHORT);
    }
  };

  return (
    <TouchableOpacity
      onLongPress={() => {
        setIsModalOpen(true);
        setSelectedTrack(item);
      }}
      pressRetentionOffset={{ bottom: 10 }}
      delayLongPress={100}
      onPress={play}
      style={styles.trackItem}
    >
      <View style={{ flexDirection: "row", flex: 0.8 }}>
        <Image
          source={{
            uri:
              (typeof item.thumbnail === "object" && item.thumbnail?.url) ||
              item.thumbnail ||
              item.artwork ||
              "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
          }}
          style={styles.trackImage}
        />
        <View style={styles.trackDetails}>
          <Text numberOfLines={1} style={styles.trackTitle}>
            {item.title?.slice(0, 20) ||
              item.filename?.slice(0, 30) ||
              "Unknown Title"}
            ...
          </Text>
          <Text numberOfLines={1} style={styles.trackArtist}>
            {item.author || item.artist || "Unknown"}
          </Text>
        </View>
      </View>
      {(currentSong?.videoId || currentSong?.id) ===
        (item?.videoId || item?.id) && (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <FontAwesome5 name="compact-disc" size={24} color={"#ffff"} />
        </Animated.View>
      )}
      {playingFrom !== "Local" && (
        <TouchableOpacity
          onPress={() => handleLike(userInfo, setFavorites, currentSong)}
          style={{ marginRight: 10 }}
        >
          {favorites.find(
            (song) => (song.videoId || song.id) === (item.videoId || item.id),
          ) && <Ionicons name="heart" size={24} color={"#FF4D67"} />}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const COLORS = {
  background: "#121212", // deep charcoal (not neon black)
  surface: "#1E1E1E", // cards / containers
  surfaceAlt: "#2A2A2A",
  primary: "#1DB954", // soft Spotify green
  secondary: "#4F7CAC", // muted blue
  textPrimary: "#FFFFFF",
  textSecondary: "#CFCFCF",
  textMuted: "#9A9A9A",
  border: "#333333",
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: sp(6),
    width: wp(150),
    height: hp(240),
    marginHorizontal: sp(2),
  },

  image: {
    width: wp(150),
    aspectRatio: 1,
    borderRadius: sp(12),
    backgroundColor: COLORS.surfaceAlt,
  },

  title: {
    fontSize: fs(14),
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  artist: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  iconContainer: {
    flexDirection: "row",
    marginTop: hp(4),
  },

  iconButton: {
    marginHorizontal: sp(6),
  },

  listContainer: {
    marginVertical: hp(3),
    padding: sp(5),
    borderRadius: sp(14),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  listTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: hp(12),
  },

  container: {
    height: hp(200),
    paddingVertical: hp(3),
  },

  quickAccessButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    padding: sp(14),
    borderRadius: sp(10),
    marginVertical: hp(8),
    minWidth: wp(160),
    alignSelf: "center",
  },

  quickAccessText: {
    color: COLORS.textPrimary,
    fontSize: fs(14),
    marginLeft: sp(10),
  },

  sectionContainer: {
    padding: sp(5),
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: fs(16),
    fontWeight: "700",
    margin: hp(4),
  },

  fullScreenContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.background,
    padding: sp(15),
    alignItems: "center",
  },

  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(12),
  },

  shareText: {
    color: COLORS.textPrimary,
    marginLeft: sp(6),
    fontSize: fs(14),
  },

  header: {
    color: COLORS.textPrimary,
    fontSize: fs(22),
    fontWeight: "800",
    textAlign: "center",
    marginBottom: hp(18),
  },

  nowPlayingImage: {
    width: "80%",
    aspectRatio: 1,
    borderRadius: sp(16),
    marginBottom: hp(20),
    alignSelf: "center",
  },

  nowPlayingTitle: {
    color: COLORS.textPrimary,
    fontSize: fs(20),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: hp(4),
  },

  nowPlayingArtist: {
    color: COLORS.textSecondary,
    fontSize: fs(15),
    textAlign: "center",
    marginBottom: hp(20),
  },

  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: hp(16),
  },

  slider: {
    flex: 1,
    height: hp(40),
  },

  timeText: {
    color: COLORS.textMuted,
    fontSize: fs(12),
    width: wp(42),
    textAlign: "center",
  },

  nowPlayingControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: sp(18),
  },

  miniPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: sp(12),
    borderRadius: sp(14),
    position: "absolute",
    left: sp(10),
    right: sp(10),
    bottom: hp(80),
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  miniPlayerImage: {
    width: wp(48),
    aspectRatio: 1,
    borderRadius: sp(10),
  },

  miniPlayerInfo: {
    flex: 1,
    marginLeft: sp(10),
  },

  miniPlayerTitle: {
    color: COLORS.textPrimary,
    fontSize: fs(15),
    fontWeight: "600",
  },

  miniPlayerArtist: {
    color: COLORS.textSecondary,
    fontSize: fs(13),
  },

  miniPlayerIcon: {
    marginLeft: sp(6),
  },

  modalContainer: {
    height: hp(420),
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: sp(16),
    borderTopRightRadius: sp(16),
  },

  queueHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: hp(10),
  },

  songItem: {
    paddingVertical: hp(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: sp(10),
    paddingHorizontal: sp(10),
  },

  songTitle: {
    fontSize: fs(15),
    color: COLORS.textPrimary,
  },

  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    padding: sp(12),
    borderRadius: sp(12),
    marginBottom: hp(6),
    justifyContent: "space-between",
  },

  trackImage: {
    width: wp(50),
    aspectRatio: 1,
    borderRadius: sp(8),
  },

  trackTitle: {
    fontSize: fs(15),
    color: COLORS.textPrimary,
    fontWeight: "500",
  },

  trackArtist: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
  },

  trackDetails: {
    marginLeft: sp(12),
    maxWidth: "65%",
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
