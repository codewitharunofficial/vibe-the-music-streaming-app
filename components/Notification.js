import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

// Store the current notification ID and playback state
let currentNotificationId = null;
let currentSongData = null;
let isPlayingSong = false;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Request notification permissions
export const requestNotificationPermission = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync(
        {
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: false,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: false,
          },
        }
      );
      if (newStatus !== "granted") {
        console.log("Notification permission denied");
        return null;
      }
    }
    return true;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};

// Download and resize image for notification
const prepareImageForNotification = async (url) => {
  try {
    const fileUri = `${FileSystem.cacheDirectory}thumbnail.jpg`;
    const { uri } = await FileSystem.downloadAsync(url, fileUri);
    console.log("Downloaded thumbnail to:", uri);

    // Resize image to 96x96 (recommended for Android notifications)
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 96, height: 96 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log("Resized thumbnail to:", manipulatedImage.uri);
    return manipulatedImage.uri;
  } catch (error) {
    console.error("Error preparing thumbnail:", error);
    return null;
  }
};

// Show or update playback notification
export const showPlaybackNotification = async (song, isPlaying) => {
  try {
    // Update playback state
    isPlayingSong = isPlaying;
    currentSongData = song;

    if (!song) {
      console.log("No song provided, skipping notification");
      return;
    }

    console.log("Showing/updating notification for song:", song);

    // Handle thumbnail
    let localThumbnailUri = null;
    if (song?.thumbnail) {
      localThumbnailUri = await prepareImageForNotification(song.thumbnail);
    }

    const notificationContent = {
      content: {
        title: song?.title || "Now Playing",
        body: song?.author || "Unknown Artist",
        sound: false,
        data: { songId: song?.videoId },
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        android: {
          channelId: "playback",
          sound: false,
          vibrate: false,
          smallIcon: "ic_notification",
          largeIcon: localThumbnailUri || null,
          color: "#1DB954",
          autoCancel: false,
          ongoing: true,
          style: {
            type: "media", // Use MediaStyle for music playback
            title: song?.title || "Now Playing",
            body: song?.author || "Unknown Artist",
            largeIcon: localThumbnailUri || null,
            actions: [
              {
                identifier: "PREV",
                buttonTitle: "Previous",
                requiresAuthentication: false,
              },
              {
                identifier: "PAUSE",
                buttonTitle: isPlaying ? "Pause" : "Play",
                requiresAuthentication: false,
              },
              {
                identifier: "NEXT",
                buttonTitle: "Next",
                requiresAuthentication: false,
              },
            ],
          },
        },
        ios: {
          attachments: song?.thumbnail
            ? [{ url: song.thumbnail, identifier: "thumbnail" }]
            : [],
        },
      },
      trigger: null,
    };

    console.log("Notification content:", notificationContent);

    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    }

    const notificationId = await Notifications.scheduleNotificationAsync(
      notificationContent
    );
    currentNotificationId = notificationId;
    console.log("Notification ID:", notificationId);
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

// Dismiss the notification
export const dismissPlaybackNotification = async () => {
  try {
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
      currentNotificationId = null;
      currentSongData = null;
      isPlayingSong = false;
      console.log("Notification dismissed");
    }
  } catch (error) {
    console.error("Error dismissing notification:", error);
  }
};

// Monitor notification dismissal to re-schedule if song is still playing
Notifications.addNotificationResponseReceivedListener(async (response) => {
  if (!currentNotificationId) return; // Notification already dismissed

  const dismissed = !response.actionIdentifier; // No action means user dismissed the notification
  if (dismissed && (isPlayingSong || currentSongData)) {
    console.log("Notification dismissed by user, re-scheduling...");
    await showPlaybackNotification(currentSongData, isPlayingSong);
  }
});

// Handle notification actions
export const setupNotificationHandler = (
  playbackObject,
  songs,
  currentIndex,
  setCurrentIndex,
  setIsPlaying
) => {
  Notifications.addNotificationResponseReceivedListener(async (response) => {
    try {
      const action = response.actionIdentifier;
      const song = songs[currentIndex];

      console.log("Notification action received:", action);

      switch (action) {
        case "PAUSE":
          const status = await playbackObject.getStatusAsync();
          if (status.isPlaying) {
            await playbackObject.pauseAsync();
            setIsPlaying(false);
            await showPlaybackNotification(song, false);
          } else {
            await playbackObject.playAsync();
            setIsPlaying(true);
            await showPlaybackNotification(song, true);
          }
          break;
        case "NEXT":
          if (currentIndex + 1 < songs.length) {
            setCurrentIndex(currentIndex + 1);
            await playbackObject.unloadAsync();
            await playbackObject.loadAsync(
              { uri: songs[currentIndex + 1].uri },
              { shouldPlay: true }
            );
            setIsPlaying(true);
            await showPlaybackNotification(songs[currentIndex + 1], true);
          }
          break;
        case "PREV":
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            await playbackObject.unloadAsync();
            await playbackObject.loadAsync(
              { uri: songs[currentIndex - 1].uri },
              { shouldPlay: true }
            );
            setIsPlaying(true);
            await showPlaybackNotification(songs[currentIndex - 1], true);
          }
          break;
      }
    } catch (error) {
      console.error("Error handling notification action:", error);
    }
  });
};

// Create notification channel for Android
export const configureNotificationChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("playback", {
      name: "Music Playback",
      importance: Notifications.AndroidImportance.HIGH,
      showBadge: false,
      enableLights: true,
      lightColor: "#1DB954",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: false,
      bypassDnd: true,
    });
    console.log("Notification channel configured");
  }
};
