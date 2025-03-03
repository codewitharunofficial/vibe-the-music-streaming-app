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
  dismissPlaybackNotification,
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
  const { repeat, setRepeat, sound, setSound, currentQueue } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    const setupNotifications = async () => {
      await configureNotificationChannel();
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        setupNotificationHandler(
          sound,
          currentQueue,
          currentIndex,
          setCurrentIndex,
          setIsPlaying
        );
      } else {
        console.log("Notification permissions not granted");
      }
    };

    setupNotifications();

    return () => {
      if (!isPlaying && !currentSong) {
        console.log("Unmounting NowPlayingScreen, dismissing notification");
        dismissPlaybackNotification();
      }
    };
  }, [sound, isPlaying, currentSong]);

  useEffect(() => {
    if (currentQueue?.length > 0 && currentSong) {
      const index = currentQueue.findIndex(
        (s) => s.videoId === currentSong.videoId
      );
      setCurrentIndex(index !== -1 ? index : 0);
    }
  }, [currentQueue, currentSong]);

  useEffect(() => {
    if (url) {
      loadAndPlayAudio();
    }
    return () => unloadAudio();
  }, [url]);

  useEffect(() => {
    if (currentSong && isVisible) {
      console.log("Updating notification with song:", currentSong);
      showPlaybackNotification(
        {
          ...currentSong,
          thumbnail: currentSong.thumbnail?.url || currentSong.thumbnail,
        },
        isPlaying
      );
    }
  }, [currentSong, isPlaying, isVisible]);

  const loadAndPlayAudio = async () => {
    if (!url) return;

    try {
      setIsSongLoading(true);
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false,
      });

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: repeat }
      );

      setSound(newSound);
      setIsPlaying(true);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 1);
      newSound.setOnPlaybackStatusUpdate(updateProgress);

      await showPlaybackNotification(
        {
          ...currentSong,
          thumbnail: currentSong.thumbnail?.url || currentSong.thumbnail,
        },
        true
      );
    } catch (error) {
      console.error("Error loading audio:", error);
    } finally {
      setIsSongLoading(false);
    }
  };

  const unloadAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      if (!isPlaying && !currentSong) {
        console.log("Unloading audio, dismissing notification");
        await dismissPlaybackNotification();
      }
    }
  };

  const updateProgress = (status) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / 1000);
      if (status.didJustFinish && !repeat) {
        playNext();
      }
    }
  };

  const playPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        await showPlaybackNotification(
          {
            ...currentSong,
            thumbnail: currentSong.thumbnail?.url || currentSong.thumbnail,
          },
          false
        );
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        await showPlaybackNotification(
          {
            ...currentSong,
            thumbnail: currentSong.thumbnail?.url || currentSong.thumbnail,
          },
          true
        );
      }
    }
  };

  const playNext = async () => {
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
      console.log("End of queue, dismissing notification");
      await dismissPlaybackNotification();
    }
  };

  const playPrev = async () => {
    if (currentIndex > 0) {
      playSong(
        currentQueue[currentIndex - 1],
        setIsSongLoading,
        setCurrentSong,
        setSongUrl
      );
      setCurrentIndex(currentIndex - 1);
    }
  };

  const seekTo = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value * 1000);
      setProgress(value);
    }
  };

  const toggleRepeat = async () => {
    setRepeat(!repeat);
    if (sound) {
      await sound.setIsLoopingAsync(!repeat);
    }
  };

  const formatTime = (seconds) => {
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
          source={{ uri: song.thumbnail }}
          style={styles.nowPlayingImage}
        />
        <Text style={styles.nowPlayingTitle}>{song.title?.slice(0, 30)}</Text>
        <Text style={styles.nowPlayingArtist}>{song.author?.slice(0, 30)}</Text>

        <View style={styles.sliderContainer}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={progress}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#888888"
            onValueChange={(value) => setProgress(value)}
            onSlidingComplete={seekTo}
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
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={playNext}>
            <Ionicons name="play-forward" size={32} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowQueue(true)}>
            <MaterialCommunityIcons name="menu" size={32} color={"#fff"} />
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
