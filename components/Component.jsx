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
  Easing,
  ImageBackground,
} from "react-native";
import { showToast } from "@/constants/utils";
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
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
  downloadAndSaveSong,
  getDownloadedSongs,
  getFavourites,
  handleLike,
  saveToRecentlyPlayed,
} from "@/constants/cachedData";
import { handleRecentlyPlayed } from "@/constants/apiCalls";
import axios from "axios";
import { COLORS } from "@/utils/colors";
import { getSectionType, ITEM_TYPES } from "@/constants/itemType";

const { width, height } = Dimensions.get("window");

// Queue row layout (fixed height so scrolling and dragging stay accurate)
const QUEUE_ROW_HEIGHT = 64;
const QUEUE_ROW_GAP = 4;
const QUEUE_TEXT_WIDTH = width - 215; // room for artwork, drag handle and menu

// ---------------------------------------------------------------------------
// Design tokens (UI only). Built around the app's deep-teal header colour
// (#054465) and the orange (#FF9F1C) that the seek bar already used.
// ---------------------------------------------------------------------------
const UI = {
  ink: "#061E2B", // deepest tone, used for icons on the accent colour
  surface: "#0B3047", // self-contained dark cards
  surfaceHi: "#124562", // artwork placeholder / raised surface
  accent: "#FF9F1C",
  accentSoft: "rgba(255,159,28,0.16)",
  accentLine: "rgba(255,159,28,0.45)",
  heart: "#FF4D67",
  good: "#3DDC97",
  glass: "rgba(255,255,255,0.12)",
  hairline: "rgba(255,255,255,0.10)",
  textHi: "#FFFFFF",
  textMid: "rgba(255,255,255,0.72)",
  textLow: "rgba(255,255,255,0.45)",
  scrim: "rgba(4,24,35,0.62)",
};

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
      activeOpacity={0.8}
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
      {/* {song?.author ? (
        <Text numberOfLines={1} style={styles.artist}>
          {song.author?.slice(0, 30)}
        </Text>
      ) : (
        song?.type === "Public" &&
        section === "custom_playlists" && (
          <Text numberOfLines={1} style={styles.artist}>
            {"Arun"}
          </Text>
        )
      )} */}
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
      {/* <Text style={styles.listTitle}>{title}</Text> */}
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
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.quickAccessButton}
      onPress={onPress}
    >
      <Feather name={iconName} size={24} color={UI.accent} />
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: hp(24) }}
      renderItem={({ item }) => {
        const [key, songs] = item;
        // Decide by what the items are, not by the section's name: names
        // change on every fetch. Charts, moods and genres are skipped because
        // their items are not songs, albums or playlists.
        return getSectionType(songs) !== ITEM_TYPES.UNKNOWN ? (
          <Section
            title={formatTitle(key)}
            songs={songs}
            onPlayPress={onPlayPress}
            onLikePress={onLikePress}
            section={key}
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
  const { userInfo } = useUser();
  const { currentIndex, setCurrentIndex, setCurrentQueue } = usePlayer();
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const flatListRef = useRef(null);
  const [fullScreen, setFullScreen] = useState(false);

  // Track text widths and animations for each item
  const [textWidths, setTextWidths] = useState({}); // Store title and artist widths: { [itemId]: { title: number, artist: number } }
  const animations = useRef({}); // Store Animated.Value for each item: { [itemId]: { titleAnim: Animated.Value, artistAnim: Animated.Value } }

  // Initialize animations for an item
  const initializeAnimations = useCallback((itemId) => {
    if (!animations.current[itemId]) {
      animations.current[itemId] = {
        titleAnim: new Animated.Value(0),
        artistAnim: new Animated.Value(0),
      };
    }
    return animations.current[itemId];
  }, []);

  // Marquee Animation Logic
  const startMarquee = useCallback((animValue, textWidth, containerWidth) => {
    if (textWidth > containerWidth) {
      const duration = textWidth * 20; // Adjust speed: 20ms per pixel
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: -textWidth,
            duration: duration,
            useNativeDriver: true,
            delay: 1000, // Pause before starting
            easing: Easing.linear,
          }),
          Animated.timing(animValue, {
            toValue: containerWidth,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      animValue.setValue(0); // Reset if text fits
    }
  }, []);

  // Handle text layout to measure width
  const handleTextLayout = useCallback((itemId, type, e) => {
    const width = e.nativeEvent.layout.width;
    setTextWidths((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: width,
      },
    }));
  }, []);

  // Start animations when text widths or queue changes
  useEffect(() => {
    queue.forEach((item) => {
      const itemId = item?.videoId?.toString() || item?.id?.toString();
      const { titleAnim, artistAnim } = initializeAnimations(itemId);
      const widths = textWidths[itemId] || {};
      const containerWidth = QUEUE_TEXT_WIDTH;
      startMarquee(titleAnim, widths.title || 0, containerWidth);
      startMarquee(artistAnim, widths.artist || 0, containerWidth);
    });
  }, [queue, textWidths, startMarquee, initializeAnimations]);

  // Clean up animations when component unmounts
  useEffect(() => {
    return () => {
      Object.values(animations.current).forEach(({ titleAnim, artistAnim }) => {
        titleAnim.stopAnimation();
        artistAnim.stopAnimation();
      });
    };
  }, []);

  useEffect(() => {
    TrackPlayer.getActiveTrackIndex().then((index) => {
      setCurrentIndex(index);
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
    console.log(`The Song has been moved from ${fromIndex} to ${toIndex}`);
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

  const close = () => setModalVisible(false);

  // Drag & drop re-ordering: update the app queue, then mirror the move in the
  // TrackPlayer queue. Tracks are matched by id (not by position) so the move
  // stays correct even if the two lists ever differ.
  const handleDragEnd = async ({ data, from, to }) => {
    setIsDragging(false);
    if (from === to) return;

    const previousQueue = queue;
    setCurrentQueue(data);

    try {
      const trackId = (song) => (song?.videoId || song?.id)?.toString();
      const rntpQueue = await TrackPlayer.getQueue();

      const fromIdx = rntpQueue.findIndex(
        (t) => t.id?.toString() === trackId(data[to]),
      );
      if (fromIdx === -1) throw new Error("Moved track not found in player");

      // The moved track must end up right after the track that now precedes it
      let toIdx = 0;
      if (to > 0) {
        const prevIdx = rntpQueue.findIndex(
          (t) => t.id?.toString() === trackId(data[to - 1]),
        );
        if (prevIdx === -1) throw new Error("Neighbour track not found");
        toIdx = fromIdx < prevIdx ? prevIdx : prevIdx + 1;
      }

      if (fromIdx !== toIdx) await TrackPlayer.move(fromIdx, toIdx);

      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeIndex !== undefined) setCurrentIndex(activeIndex);
    } catch (error) {
      console.error("Error moving track:", error);
      setCurrentQueue(previousQueue); // roll the list back
      showToast("Couldn't move the song", 3000);
    }
  };

  return (
    // <ImageBackground
    //   source={require("@/assets/images/background.jpg")}
    //   blurRadius={10}
    //   style={{ flex: 1 }}
    // >
    <BottomModal
      // onTouchOutside={() => console.log("Touched Outside")}
      visible={isVisible}
      modalStyle={{ backgroundColor: "transparent" }}
      style={{
        width: width,
        height: fullScreen ? height : height * 0.5,
        backgroundColor: "transparent",
      }}
      overlayBackgroundColor="transparent"
      swipeDirection={isDragging ? [] : ["down"]}
      swipeThreshold={1000}
      onSwipeRelease={({ swipeDirection }) => {
        swipeDirection === "down"
          ? onClose()
          : swipeDirection === "up"
            ? setFullScreen(true)
            : console.log("Do Nothing");
      }}
    >
      <ModalContent
        style={{
          height: height * 0.5,
          paddingTop: 12,
          padding: 14,
          backgroundColor: UI.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          // backgroundColor: "transparent",
        }}
      >
        <View style={styles.handle} />
        <View style={styles.queueHeader}>
          <Text style={styles.queueTitle}>Current Queue</Text>
        </View>

        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            ref={flatListRef}
            containerStyle={{ flex: 1 }}
            initialScrollIndex={Math.min(
              currentIndex ?? 0,
              Math.max(queue.length - 1, 0),
            )}
            data={queue}
            maxToRenderPerBatch={10}
            showsVerticalScrollIndicator={false}
            getItemLayout={(data, index) => ({
              length: QUEUE_ROW_HEIGHT + QUEUE_ROW_GAP,
              offset: (QUEUE_ROW_HEIGHT + QUEUE_ROW_GAP) * index,
              index,
            })}
            keyExtractor={(item) =>
              item?.videoId?.toString() || item?.id?.toString()
            }
            onDragBegin={() => setIsDragging(true)}
            onRelease={() => setIsDragging(false)}
            onDragEnd={handleDragEnd}
            renderItem={({ item, getIndex, drag, isActive }) => {
              const index = getIndex();
              const itemId = item?.videoId?.toString() || item?.id?.toString();
              const { titleAnim, artistAnim } = initializeAnimations(itemId);
              const containerWidth = QUEUE_TEXT_WIDTH;
              const isCurrent =
                (currentSong?.id || currentSong?.videoId) ===
                (item.id || item.videoId);

              return (
                <ScaleDecorator activeScale={1.03}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isActive}
                    onLongPress={drag}
                    delayLongPress={200}
                    onPress={async () => {
                      await TrackPlayer.skip(index);
                    }}
                    style={[
                      styles.songItem,
                      isCurrent && styles.songItemActive,
                      isActive && styles.songItemDragging,
                    ]}
                  >
                    <Image
                      source={{
                        uri:
                          item.thumbnail?.url ||
                          item.thumbnail ||
                          item.artwork ||
                          "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
                      }}
                      style={styles.queueImage}
                    />
                    <View style={{ flexDirection: "column", flex: 1 }}>
                      <View
                        style={{ overflow: "hidden", width: containerWidth }}
                      >
                        <Animated.View
                          style={{
                            transform: [
                              {
                                translateX: isCurrent ? titleAnim : 0,
                              },
                            ],
                          }}
                        >
                          <Text
                            style={[
                              styles.songTitle,
                              isCurrent && styles.songTitleActive,
                            ]}
                            numberOfLines={1}
                            onLayout={(e) =>
                              handleTextLayout(itemId, "title", e)
                            }
                          >
                            {item.title || "Unknown Title"}
                          </Text>
                        </Animated.View>
                      </View>
                      <View
                        style={{ overflow: "hidden", width: containerWidth }}
                      >
                        <Animated.View
                          style={{
                            transform: [
                              {
                                translateX: isCurrent ? artistAnim : 0,
                              },
                            ],
                          }}
                        >
                          <Text
                            style={styles.artist}
                            numberOfLines={1}
                            onLayout={(e) =>
                              handleTextLayout(itemId, "artist", e)
                            }
                          >
                            {item.author || "Unknown Artist"}
                          </Text>
                        </Animated.View>
                      </View>
                    </View>

                    {/* Drag handle: press and drag to re-order */}
                    <TouchableOpacity
                      onPressIn={drag}
                      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                      style={styles.dragHandle}
                    >
                      <MaterialIcons
                        name="drag-handle"
                        size={24}
                        color={isActive ? UI.accent : UI.textLow}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(true);
                        setCurrentIndex(index);
                        setSelectedTrack(item);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ position: "absolute", top: 22, right: 12 }}
                    >
                      <Entypo
                        name="dots-three-vertical"
                        size={20}
                        color={UI.textMid}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </ScaleDecorator>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </GestureHandlerRootView>
      </ModalContent>
      <SongOptionsModal
        isVisible={modalVisible}
        onClose={close}
        song={selectedTrack}
        moveSong={moveSong}
        handleQueueSong={addToRNTPQueue}
      />
    </BottomModal>
    // </ImageBackground>
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
    const [fullScreen, setFullScreen] = useState(false);

    // Animation-related state
    const titleAnim = useRef(new Animated.Value(0)).current;
    const artistAnim = useRef(new Animated.Value(0)).current;
    const [titleWidth, setTitleWidth] = useState(0);
    const [artistWidth, setArtistWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(width - 40); // Adjust based on padding/margins

    // Handle Text Layout to measure text width
    const handleTitleLayout = (e) => {
      setTitleWidth(e.nativeEvent.layout.width);
    };

    const handleArtistLayout = (e) => {
      setArtistWidth(e.nativeEvent.layout.width);
    };

    // Marquee Animation Logic
    const startMarquee = useCallback(
      (animValue, textWidth) => {
        if (textWidth > containerWidth) {
          const duration = textWidth * 20; // Adjust speed: 20ms per pixel
          Animated.loop(
            Animated.sequence([
              Animated.timing(animValue, {
                toValue: -textWidth,
                duration: duration,
                useNativeDriver: true,
                delay: 1000, // Pause before starting
              }),
              Animated.timing(animValue, {
                toValue: containerWidth,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ).start();
        } else {
          animValue.setValue(0); // Reset if text fits
        }
      },
      [containerWidth],
    );

    // Reset and start animation when song changes or text width updates
    useEffect(() => {
      titleAnim.setValue(0);
      artistAnim.setValue(0);
      startMarquee(titleAnim, titleWidth);
      startMarquee(artistAnim, artistWidth);
    }, [
      currentSong,
      titleWidth,
      artistWidth,
      startMarquee,
      titleAnim,
      artistAnim,
    ]);

    // Rest of your existing useEffect and handler functions remain unchanged
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
          showToast("Error playing song", 3000);
        },
      );

      return () => {
        trackChangeListener.remove();
        queueEndListener.remove();
        errorListener.remove();
      };
    }, [handleTrackChange]);

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

    // Keep the local index in step when the queue is re-ordered (drag & drop)
    useEffect(() => {
      const idx = currentQueue.findIndex(
        (s) =>
          (s.videoId || s.id) === (currentSong?.videoId || currentSong?.id),
      );
      if (idx !== -1) setCurrentIndex(idx);
    }, [currentQueue]);

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
        modalStyle={{ backgroundColor: "transparent" }}
        style={{ backgroundColor: "transparent" }}
        modalAnimation={new SlideAnimation({ slideFrom: "bottom" })}
        swipeDirection={["down"]}
        swipeThreshold={1000}
        onTouchOutside={() => {
          console.log("Touched Outside");
        }}
        onSwipeRelease={({ swipeDirection }) => {
          if (swipeDirection === "down") {
            !showQueue && setIsVisible(false);
            setFullScreen(false);
          } else if (swipeDirection === "up") {
            !showQueue && setFullScreen(true);
          }
        }}
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
          style={{
            height: fullScreen ? height + hp(100) : hp(800),
            paddingTop: 50,
            padding: 20,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
          blurRadius={10}
          resizeMode="cover"
        >
          {/* Dark wash so text stays readable on any artwork */}
          <View pointerEvents="none" style={styles.scrim} />
          <View pointerEvents="none" style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.playingFrom}>{`Playing From ${playingFrom}`}</Text>

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
          <View style={{ overflow: "hidden", width: containerWidth }}>
            <Animated.View style={{ transform: [{ translateX: titleAnim }] }}>
              <Text
                style={styles.nowPlayingTitle}
                numberOfLines={1}
                onLayout={handleTitleLayout}
              >
                {currentSong.title || "Unknown Title"}
              </Text>
            </Animated.View>
          </View>
          <View style={{ overflow: "hidden", width: containerWidth }}>
            <Animated.View style={{ transform: [{ translateX: artistAnim }] }}>
              <Text
                style={styles.nowPlayingArtist}
                numberOfLines={1}
                onLayout={handleArtistLayout}
              >
                {currentSong.author || currentSong.artist || "Unknown Artist"}
              </Text>
            </Animated.View>
          </View>
          {playingFrom !== "Local" && (
            <View style={[styles.nowPlayingControls, styles.actionRow]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => shareSong(currentSong)}
              >
                <AntDesign name="sharealt" size={22} color={UI.textHi} />
              </TouchableOpacity>
              <View style={styles.actionGroup}>
                <TouchableOpacity
                  disabled={
                    (isDownloading || isDownloaded) &&
                    (currentDownload?.id || currentDownload?.videoId) ===
                    (currentSong?.id || currentSong?.videoId)
                  }
                  style={styles.actionButton}
                  onPress={async () => {
                    setIsDownloading(true);
                    await downloadAndSaveSong(
                      currentSong,
                      setDownloadProgess,
                      setCurrentDownload,
                    );
                    showToast("Song Downloaded", 3000);
                    setIsDownloading(false);
                    setIsDownloaded(true);
                  }}
                >
                  {isDownloading &&
                    (currentDownload?.id || currentDownload?.videoId) ===
                    (currentSong?.id || currentSong?.videoId) ? (
                    <View style={styles.downloadProgress}>
                      <Text style={styles.downloadProgressText}>
                        {downloadProgress}%
                      </Text>
                    </View>
                  ) : downloaded.find(
                    (s) => s.id === (currentSong.id || currentSong.videoId),
                  ) ? (
                    <FontAwesome
                      name="check-circle"
                      size={24}
                      color={UI.good}
                      style={{ alignSelf: "center" }}
                    />
                  ) : (
                    <Feather name="download" size={22} color={UI.textHi} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () =>
                    await handleLike(userInfo, setFavorites, currentSong)
                  }
                >
                  {favorites.find(
                    (item) =>
                      (item.videoId || item?.id) ===
                      (currentSong?.videoId || currentSong.id),
                  ) ? (
                    <Ionicons name="heart" size={24} color={UI.heart} />
                  ) : (
                    <Ionicons
                      name="heart-outline"
                      size={24}
                      color={UI.textHi}
                    />
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
              minimumTrackTintColor={UI.accent}
              maximumTrackTintColor="rgba(255,255,255,0.28)"
              thumbTintColor={UI.accent}
              tapToSeek={true}
              onValueChange={seekTo}
              onSlidingComplete={seekTo}
              disabled={isSongLoading}
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
          <View style={[styles.nowPlayingControls, styles.transportRow]}>
            <TouchableOpacity onPress={toggleRepeat}>
              {repeat ? (
                <MaterialIcons
                  name="repeat-one"
                  size={26}
                  color={UI.accent}
                />
              ) : (
                <MaterialCommunityIcons
                  name="repeat"
                  size={26}
                  color={UI.textMid}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={playPrev} disabled={currentIndex <= 0}>
              <Ionicons
                name="play-back"
                size={34}
                color={currentIndex <= 0 ? UI.textLow : UI.textHi}
              />
            </TouchableOpacity>
            {isSongLoading || playbackState.state === State.Buffering ? (
              <View style={styles.playButton}>
                <ActivityIndicator size={32} color={UI.ink} />
              </View>
            ) : (
              <TouchableOpacity onPress={playPause} style={styles.playButton}>
                <Ionicons
                  name={
                    playbackState.state === State.Playing ? "pause" : "play"
                  }
                  size={34}
                  color={UI.ink}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={playNext}
              disabled={currentIndex + 1 >= currentQueue.length}
            >
              <Ionicons
                name="play-forward"
                size={34}
                color={
                  currentIndex + 1 >= currentQueue.length
                    ? UI.textLow
                    : UI.textHi
                }
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQueue(true)}>
              <MaterialCommunityIcons
                name="menu"
                size={26}
                color={UI.textMid}
              />
            </TouchableOpacity>
          </View>
          {fullScreen && (
            <View
              style={{
                flexDirection: "row",
                width: width,
                height: hp(200),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={styles.lyricsEmpty}>No Lyrics Available</Text>
            </View>
          )}
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

// Example styles (adjust as needed)
// const styles = {
//   header: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   nowPlayingImage: {
//     width: width - 40,
//     height: width - 40,
//     borderRadius: 10,
//     alignSelf: 'center',
//     marginVertical: 20,
//   },
//   nowPlayingTitle: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginVertical: 5,
//   },
//   nowPlayingArtist: {
//     color: '#ccc',
//     fontSize: 16,
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   nowPlayingControls: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   shareButton: {
//     padding: 10,
//   },
//   miniPlayerIcon: {
//     padding: 10,
//   },
//   sliderContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     marginVertical: 10,
//   },
//   slider: {
//     flex: 1,
//     marginHorizontal: 10,
//   },
//   timeText: {
//     color: '#fff',
//     fontSize: 12,
//   },
// };

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
      activeOpacity={0.9}
      onPress={() => onOpen(true)}
      style={[
        styles.miniPlayerContainer,
        { bottom: route === "(tabs)" ? hp(126) : hp(150) },
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
          alignItems: "center",
          gap: wp(10),
          marginLeft: wp(10),
          flex: wp(0.3),
        }}
      >
        <TouchableOpacity
          style={styles.miniPlayerIcon}
          onPress={async () => {
            await handleLike(userInfo, setFavorites, currentSong);
          }}
        >
          {favorites.find(
            (item) =>
              (item.videoId || item.id) ===
              (currentSong.videoId || currentSong.id),
          ) ? (
            <Ionicons name="heart" size={24} color={UI.heart} />
          ) : (
            <Ionicons name="heart-outline" size={24} color={UI.textHi} />
          )}
        </TouchableOpacity>
        {isSongLoading || playbackState.state === State.Buffering ? (
          <View style={styles.miniPlayButton}>
            <ActivityIndicator size={24} color={UI.ink} />
          </View>
        ) : (
          <TouchableOpacity onPress={playPause} style={styles.miniPlayButton}>
            <Ionicons
              name={playbackState.state === State.Playing ? "pause" : "play"}
              size={22}
              color={UI.ink}
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

  // Existing rotation animation
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Marquee animation state
  const titleAnim = useRef(new Animated.Value(0)).current;
  const artistAnim = useRef(new Animated.Value(0)).current;
  const [titleWidth, setTitleWidth] = useState(0);
  const [artistWidth, setArtistWidth] = useState(0);
  const containerWidth = width * 0.4; // Adjust based on layout (e.g., 50% of screen width)

  // Handle Text Layout to measure text width
  const handleTitleLayout = (e) => {
    setTitleWidth(e.nativeEvent.layout.width);
  };

  const handleArtistLayout = (e) => {
    setArtistWidth(e.nativeEvent.layout.width);
  };

  // Marquee Animation Logic
  const startMarquee = useCallback(
    (animValue, textWidth) => {
      if (textWidth > containerWidth) {
        const duration = textWidth * 20; // Adjust speed: 20ms per pixel
        Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: -textWidth,
              duration: duration,
              useNativeDriver: true,
              delay: 1000, // Pause before starting
              easing: Easing.linear,
            }),
            Animated.timing(animValue, {
              toValue: containerWidth,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      } else {
        animValue.setValue(0); // Reset if text fits
      }
    },
    [containerWidth],
  );

  // Start or reset marquee animation when item or text width changes
  useEffect(() => {
    titleAnim.setValue(0);
    artistAnim.setValue(0);
    startMarquee(titleAnim, titleWidth);
    startMarquee(artistAnim, artistWidth);
  }, [item, titleWidth, artistWidth, startMarquee, titleAnim, artistAnim]);

  // Existing rotation animation for the disc
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
      setPlayingFrom(playingFrom);

      const track = {
        id: item.videoId || item.id,
        url: `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${item.videoId || item.id
          }&email=${userInfo?.email || ""}`,
        title: item.title || "Unknown Title",
        artist: item.author || "Unknown Artist",
        artwork:
          item.thumbnail?.url ||
          item.thumbnail ||
          item.artwork ||
          "https://res.cloudinary.com/dhlr0ufcb/image/upload/v1742872099/icon_ebgvfw.png",
      };
      await TrackPlayer.add(track);
      await TrackPlayer.skip(0);
      await TrackPlayer.play();
      setCurrentSong(track);

      console.log("Songs To Be Added In The Queue: ", songs);

      const newQueue = songs.slice(
        index,
        songs.length > 10 ? 10 : songs.length,
      );
      setCurrentQueue(newQueue);

      const tracks = newQueue.map((s) => ({
        id: s.videoId || s.id,
        url:
          s.uri ||
          `${process.env.EXPO_PUBLIC_API}/api/play?videoId=${s.videoId || s.id
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
      }));

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
      showToast("Error playing song", 3000);
    }
  };

  // Presentation only: is this row the track that is currently loaded?
  const isCurrent =
    (currentSong?.videoId || currentSong?.id) === (item?.videoId || item?.id);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => {
        setIsModalOpen(true);
        setSelectedTrack(item);
      }}
      pressRetentionOffset={{ bottom: 10 }}
      delayLongPress={100}
      onPress={play}
      style={[styles.trackItem, isCurrent && styles.trackItemActive]}
    // key={index}
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
          <View
            style={{
              overflow: "hidden",
              width:
                (currentSong?.id || currentSong?.videoId) ===
                  (item.videoId || item.id)
                  ? containerWidth
                  : "100%",
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    translateX:
                      (currentSong?.id || currentSong?.videoId) ===
                        (item.videoId || item.id)
                        ? titleAnim
                        : 0,
                  },
                ],
              }}
            >
              <Text
                numberOfLines={1}
                style={[styles.trackTitle, isCurrent && styles.trackTitleActive]}
                onLayout={handleTitleLayout}
              >
                {item.title || item.filename || "Unknown Title"}
              </Text>
            </Animated.View>
          </View>
          <View style={{ overflow: "hidden", width: containerWidth }}>
            <Animated.View
              style={{
                transform: [
                  {
                    translateX:
                      (currentSong?.id || currentSong?.videoId) ===
                        (item.videoId || item.id)
                        ? artistAnim
                        : 0,
                  },
                ],
              }}
            >
              <Text
                numberOfLines={1}
                style={styles.trackArtist}
                onLayout={handleArtistLayout}
              >
                {item.author || item.artist || "Unknown"}
              </Text>
            </Animated.View>
          </View>
        </View>
      </View>
      {(currentSong?.videoId || currentSong?.id) ===
        (item?.videoId || item?.id) && (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <FontAwesome5 name="compact-disc" size={24} color={UI.accent} />
          </Animated.View>
        )}
      {playingFrom !== "Local" && (
        <TouchableOpacity
          onPress={() => handleLike(userInfo, setFavorites, item)} // Pass item instead of currentSong
          style={{ marginRight: 10 }}
        >
          {favorites.find(
            (song) => (song.videoId || song.id) === (item.videoId || item.id),
          ) ? (
            <Ionicons name="heart" size={24} color={UI.heart} />
          ) : (
            <Ionicons name="heart-outline" size={24} color={UI.textHi} />
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // -------------------------------------------------------------------------
  // Home: cards and sections
  // -------------------------------------------------------------------------
  cardContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: sp(4),
    width: wp(124),
    marginHorizontal: sp(6),
  },

  image: {
    width: wp(124),
    aspectRatio: 1,
    borderRadius: sp(16),
    backgroundColor: UI.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
  },

  title: {
    fontSize: fs(14),
    fontWeight: "700",
    color: UI.textHi,
    textAlign: "left",
    width: "100%",
    letterSpacing: 0.1,
    marginTop: hp(2),
  },

  artist: {
    fontSize: fs(12.5),
    color: UI.textMid,
    textAlign: "left",
    width: "100%",
  },

  iconContainer: {
    flexDirection: "row",
    marginTop: hp(4),
  },

  iconButton: {
    marginHorizontal: sp(6),
  },

  listContainer: {
    paddingHorizontal: sp(8),
    paddingTop: sp(6),
    backgroundColor: UI.surface,
    borderRadius: sp(22),
    marginHorizontal: sp(8),
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },

  listTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: UI.textHi,
    marginBottom: hp(1),
  },

  container: {
    height: hp(196),
    paddingVertical: hp(10),
  },

  quickAccessButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: sp(14),
    paddingHorizontal: sp(18),
    borderRadius: sp(16),
    marginVertical: hp(8),
    flex: 1,
    minWidth: wp(140),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  quickAccessText: {
    color: COLORS.textPrimary,
    fontSize: fs(14),
    fontWeight: "600",
    marginLeft: sp(12),
  },

  sectionContainer: {
    paddingVertical: sp(3),
    marginBottom: hp(10),
  },

  sectionTitle: {
    color: UI.textHi,
    fontSize: fs(19),
    fontWeight: "800",
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginHorizontal: sp(18),
    marginTop: hp(8),
    marginBottom: hp(8),
  },

  // -------------------------------------------------------------------------
  // Now Playing
  // -------------------------------------------------------------------------
  fullScreenContainer: {
    width: wp(360),
    height: hp(800),
    backgroundColor: COLORS.background,
    padding: sp(15),
    alignItems: "center",
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.scrim,
  },

  handleWrap: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginBottom: 10,
  },

  playingFrom: {
    color: UI.textMid,
    fontSize: fs(12),
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: hp(4),
  },

  header: {
    color: UI.textHi,
    fontSize: fs(16),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: hp(18),
  },

  nowPlayingImage: {
    width: wp(240),
    aspectRatio: 1,
    borderRadius: sp(24),
    marginBottom: hp(22),
    alignSelf: "center",
    backgroundColor: UI.surfaceHi,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    // elevation: 14,
  },

  nowPlayingTitle: {
    color: UI.textHi,
    fontSize: fs(22),
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: hp(4),
  },

  nowPlayingArtist: {
    color: UI.textMid,
    fontSize: fs(15),
    textAlign: "center",
    marginBottom: hp(15),
  },

  actionRow: {
    paddingHorizontal: sp(4),
    marginBottom: hp(6),
  },

  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(10),
  },

  actionButton: {
    width: sp(44),
    height: sp(44),
    borderRadius: sp(22),
    backgroundColor: UI.glass,
    alignItems: "center",
    justifyContent: "center",
  },

  downloadProgress: {
    alignItems: "center",
    justifyContent: "center",
  },

  downloadProgressText: {
    fontSize: fs(11),
    fontWeight: "700",
    color: UI.textHi,
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

  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: hp(10),
  },

  slider: {
    flex: 1,
    height: hp(40),
  },

  timeText: {
    color: UI.textMid,
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

  transportRow: {
    paddingHorizontal: sp(4),
  },

  playButton: {
    width: sp(72),
    height: sp(72),
    borderRadius: sp(36),
    backgroundColor: UI.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: UI.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },

  lyricsEmpty: {
    color: UI.textMid,
    textAlign: "center",
    borderWidth: 1,
    borderColor: UI.hairline,
    backgroundColor: UI.glass,
    paddingVertical: sp(16),
    paddingHorizontal: sp(24),
    borderRadius: sp(16),
    overflow: "hidden",
  },

  // -------------------------------------------------------------------------
  // Mini player
  // -------------------------------------------------------------------------
  miniPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: sp(10),
    borderRadius: sp(20),
    position: "absolute",
    left: sp(10),
    right: sp(10),
    bottom: hp(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },

  miniPlayerImage: {
    width: wp(46),
    aspectRatio: 1,
    borderRadius: sp(12),
  },

  miniPlayerInfo: {
    flex: 0.8,
    marginLeft: sp(12),
  },

  miniPlayerTitle: {
    color: COLORS.textPrimary,
    fontSize: fs(15),
    fontWeight: "700",
  },

  miniPlayerArtist: {
    color: COLORS.textSecondary,
    fontSize: fs(12.5),
    marginTop: hp(1),
  },

  miniPlayerIcon: {
    marginLeft: sp(6),
  },

  miniPlayButton: {
    width: sp(38),
    height: sp(38),
    borderRadius: sp(19),
    backgroundColor: UI.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  // -------------------------------------------------------------------------
  // Queue
  // -------------------------------------------------------------------------
  modalContainer: {
    height: hp(420),
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: sp(16),
    borderTopRightRadius: sp(16),
  },

  queueHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.hairline,
    paddingBottom: hp(12),
    marginBottom: hp(6),
  },

  queueTitle: {
    fontSize: fs(18),
    fontWeight: "800",
    letterSpacing: -0.2,
    color: UI.textHi,
  },

  queueImage: {
    height: 50,
    width: 50,
    borderRadius: 12,
    backgroundColor: UI.surfaceHi,
  },

  songItem: {
    height: QUEUE_ROW_HEIGHT,
    paddingHorizontal: sp(10),
    marginBottom: QUEUE_ROW_GAP,
    borderRadius: sp(14),
    flexDirection: "row",
    alignItems: "center",
    gap: sp(12),
  },

  songItemDragging: {
    backgroundColor: UI.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.accentLine,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },

  dragHandle: {
    position: "absolute",
    top: 20,
    right: 44,
  },

  songItemActive: {
    backgroundColor: UI.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.accentLine,
  },

  songTitle: {
    fontSize: fs(15),
    fontWeight: "600",
    color: UI.textHi,
  },

  songTitleActive: {
    color: UI.accent,
  },

  // -------------------------------------------------------------------------
  // Track rows (lists elsewhere in the app)
  // -------------------------------------------------------------------------
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    padding: sp(10),
    borderRadius: sp(16),
    marginBottom: hp(8),
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
  },

  trackItemActive: {
    backgroundColor: UI.accentSoft,
    borderColor: UI.accentLine,
  },

  trackImage: {
    width: wp(50),
    aspectRatio: 1,
    borderRadius: sp(12),
  },

  trackTitle: {
    fontSize: fs(15),
    color: COLORS.textPrimary,
    fontWeight: "600",
  },

  trackTitleActive: {
    color: UI.accent,
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