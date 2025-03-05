import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { BottomModal, ModalContent, SlideAnimation } from "react-native-modals";
// import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { playSong } from "@/constants/player";
import { Audio } from "expo-av";
import {
  requestNotificationPermission,
  showPlaybackNotification,
  setupNotificationHandler,
  configureNotificationChannel,
} from "@/components/Notification";

const { width, height } = Dimensions.get("window");

// SongCard Component
const SongCard = ({ song, onPlayPress, onLikePress, isPlaying, section }) => {
  return (
    <TouchableOpacity
      onPress={() => onPlayPress(section, song)}
      style={styles.cardContainer}
    >
      <Image source={{ uri: song.thumbnail }} style={styles.image} />
      <Text style={styles.title}>{song.title?.slice(0, 30)}</Text>
      <Text style={styles.artist}>{song.author?.slice(0, 30)}</Text>
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
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onPlayPress={onPlayPress}
              onLikePress={onLikePress}
              section={section}
              // isPlaying={item.videoId === playingSongId}
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
      renderItem={({ item }) => {
        const [key, songs] = item;
        return key !== "charts" &&
          key !== "moods_and_moments" &&
          key !== "genres" ? (
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
  const { setIsSongLoading, setCurrentSong, setSongUrl } = useSong();

  return (
    <Modal transparent visible={isVisible} animationType="slide">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => onClose(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.queueHeader}>
            <Text style={styles.title}>Queue</Text>
          </View>

          <FlatList
            data={queue}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  playSong(item, setIsSongLoading, setCurrentSong, setSongUrl);
                }}
                style={styles.songItem}
              >
                <Text style={styles.songTitle}>{item.title?.slice(0, 30)}</Text>
                <Text style={styles.artist}>{item.author?.slice(0, 30)}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

import TrackPlayer, { Capability, RepeatMode, Event, usePlaybackState, useProgress } from 'react-native-track-player';

const NowPlayingScreen = ({
  song,
  isVisible,
  setIsVisible,
  isSongLoading,
  url,
}) => {
  const { isPlaying, setIsPlaying } = useSong();
  const { currentSong, setCurrentSong, setSongUrl, setIsSongLoading } = useSong();
  const { repeat, setRepeat, currentQueue } = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();

  // Setup TrackPlayer on component mount
  useEffect(() => {
    const setupPlayer = async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
          icon: require('./assets/images/icon.png'), // Ensure this path points to a valid image in your assets
        });
        console.log("TrackPlayer setup complete");
      } catch (error) {
        console.error("Error setting up TrackPlayer:", error);
      }
    };

    setupPlayer();

    return () => {
      TrackPlayer.reset();
    };
  }, []);

  // Update currentIndex based on currentSong and currentQueue
  useEffect(() => {
    if (currentQueue?.length > 0 && currentSong) {
      const index = currentQueue.findIndex(
        (s) => s.videoId === currentSong.videoId
      );
      setCurrentIndex(index !== -1 ? index : 0);
    }
  }, [currentQueue, currentSong]);

  // Load and play audio when url or currentSong changes
  useEffect(() => {
    if (url && currentSong) {
      loadAndPlayAudio();
    }
  }, [url, currentSong]);

  const loadAndPlayAudio = async () => {
    if (!url || !currentSong) return;

    try {
      setIsSongLoading(true);
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: currentSong.videoId,
        url: url,
        title: currentSong.title || "Now Playing",
        artist: currentSong.author || "Unknown Artist",
        artwork: currentSong.thumbnail?.url || currentSong.thumbnail || "https://via.placeholder.com/150",
      });
      await TrackPlayer.play();
      setIsPlaying(true);
      console.log("Track loaded and playing:", currentSong.title);
    } catch (error) {
      console.error("Error loading audio:", error);
    } finally {
      setIsSongLoading(false);
    }
  };

  const playPause = async () => {
    try {
      if (playbackState === 'playing') {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const playNext = async () => {
    try {
      if (currentIndex + 1 < currentQueue.length) {
        playSong(
          currentQueue[currentIndex + 1],
          setIsSongLoading,
          setCurrentSong,
          setSongUrl
        );
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsPlaying(false);
        setCurrentSong(null);
        setSongUrl(null);
        await TrackPlayer.reset();
      }
    } catch (error) {
      console.error("Error playing next track:", error);
    }
  };

  const playPrev = async () => {
    try {
      if (currentIndex > 0) {
        playSong(
          currentQueue[currentIndex - 1],
          setIsSongLoading,
          setCurrentSong,
          setSongUrl
        );
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error("Error playing previous track:", error);
    }
  };

  const seekTo = async (value) => {
    try {
      await TrackPlayer.seekTo(value);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const toggleRepeat = async () => {
    try {
      setRepeat(!repeat);
      await TrackPlayer.setRepeatMode(repeat ? RepeatMode.Off : RepeatMode.Track);
    } catch (error) {
      console.error("Error toggling repeat:", error);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!song) return null;

  return (
    <BottomModal
      visible={isVisible}
      onTouchOutside={() => setIsVisible(false)}
      modalAnimation={new SlideAnimation({ slideFrom: "bottom" })}
      swipeDirection={["down"]}
      swipeThreshold={200}
      onSwiping={(event) => !showQueue && setIsVisible(false)}
      style={{ flex: 1 }}
    >
      <ModalContent style={styles.fullScreenContainer}>
        <Text style={styles.header}>Vibe - Now Playing</Text>

        <Image
          source={{ uri: song.thumbnail?.url || song.thumbnail }}
          style={styles.nowPlayingImage}
        />
        <Text style={styles.nowPlayingTitle}>{song.title?.slice(0, 30)}</Text>
        <Text style={styles.nowPlayingArtist}>{song.author?.slice(0, 30)}</Text>

        <View style={styles.sliderContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#888888"
            onValueChange={(value) => seekTo(value)}
            onSlidingComplete={(value) => seekTo(value)}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.nowPlayingControls}>
          <TouchableOpacity onPress={toggleRepeat}>
            {repeat ? (
              <MaterialIcons name="repeat-one" size={32} color="white" />
            ) : (
              <MaterialCommunityIcons name="repeat" size={32} color="white" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={playPrev}>
            <Ionicons name="play-back" size={32} color="white" />
          </TouchableOpacity>
          {isSongLoading ? (
            <ActivityIndicator size={32} color="white" />
          ) : (
            <TouchableOpacity onPress={playPause}>
              <Ionicons
                name={playbackState === 'playing' ? "pause" : "play"}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={playNext}>
            <Ionicons name="play-forward" size={32} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowQueue(true)}>
            <MaterialCommunityIcons name="menu" size={32} color="#fff" />
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


const MiniPlayer = ({
  song,
  onOpen,
  isSongLoading,
  isPlaying,
  setIsPlaying,
}) => {
  const { sound } = usePlayer();

  if (!song) return null;

  return (
    <TouchableOpacity
      onPress={() => onOpen(true)}
      style={styles.miniPlayerContainer}
    >
      <Image source={{ uri: song.thumbnail }} style={styles.miniPlayerImage} />
      <View style={styles.miniPlayerInfo}>
        <Animated.Text style={styles.miniPlayerTitle}>
          {song.title?.slice(0, 30)}
        </Animated.Text>
        <Text style={styles.miniPlayerArtist}>{song.author?.slice(0, 30)}</Text>
      </View>
      {!isSongLoading && !isPlaying ? (
        <TouchableOpacity
          style={styles.miniPlayerIcon}
          onPress={() => {
            sound.playAsync();
            setIsPlaying(true);
          }}
        >
          <Ionicons name="play" size={24} color="white" />
        </TouchableOpacity>
      ) : !isSongLoading && isPlaying ? (
        <TouchableOpacity
          style={styles.miniPlayerIcon}
          onPress={() => {
            sound.pauseAsync();
            setIsPlaying(false);
          }}
        >
          <Ionicons name="pause" size={24} color="white" />
        </TouchableOpacity>
      ) : (
        <ActivityIndicator
          size={24}
          color={"white"}
          style={styles.miniPlayerIcon}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 10,
    alignItems: "center",
    width: 120,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 5,
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
    backgroundColor: "#222",
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
    padding: width * 0.03,
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
    // flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    width: width,
    height: height * 0.93,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 20,
  },
  nowPlayingImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  nowPlayingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },
  nowPlayingArtist: {
    fontSize: 16,
    color: "#BBB",
    textAlign: "center",
    marginBottom: 20,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    marginBottom: 10,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    color: "#FFF",
    fontSize: 14,
    marginHorizontal: 10,
  },
  nowPlayingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "60%",
    marginTop: 20,
  },
  miniPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "lightblue",
    padding: 10,
    borderRadius: 10,
    position: "absolute",
    bottom: height * 0.09,
    left: 10,
    right: 10,
  },
  miniPlayerImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  miniPlayerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  miniPlayerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  miniPlayerArtist: {
    color: "gray",
    fontSize: 14,
  },
  miniPlayerIcon: {
    marginRight: 10,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContainer: {
    height: "50%", // Half-screen modal
    backgroundColor: "#222",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  },
  songTitle: {
    fontSize: 16,
    color: "#fff",
  },
  artist: {
    fontSize: 14,
    color: "#aaa",
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
};
