import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

// Create notification channel for Android
export const configureNotificationChannel = async () => {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("playback", {
        name: "Music Playback",
        importance: Notifications.AndroidImportance.HIGH,
        showBadge: false,
        enableLights: true,
        lightColor: "#1DB954",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: false,
        bypassDnd: true, // Allow notification to bypass Do Not Disturb
      });
      console.log("Notification channel configured successfully");
    }
  } catch (error) {
    console.error("Error configuring notification channel:", error);
    throw error;
  }
};

// Show playback notification
export const showPlaybackNotification = async (song, isPlaying) => {
  try {
    // Ensure channel is created before displaying notification
    await configureNotificationChannel();

    // Log the thumbnail URL to debug
    console.log("Thumbnail URL:", song?.thumbnail);

    // Validate thumbnail URL (fallback to placeholder text if invalid)
    const thumbnailUrl =
      song?.thumbnail &&
      typeof song.thumbnail === "string" &&
      song.thumbnail.startsWith("http")
        ? song.thumbnail
        : null;

    // Ensure title and body are non-null
    const title = song?.title || "Now Playing";
    const artist = song?.author || "Unknown Artist";

    // Create a notification body with control emojis (fallback for devices that don't support bigPicture)
    const body = `${artist}`;

    // Log notification details before displaying
    console.log(
      "Displaying notification with title:",
      title,
      "body:",
      body,
      "isPlaying:",
      isPlaying
    );

    await Notifications.dismissAllNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: false,
        data: { songId: song?.videoId || "" },
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        android: {
          channelId: "playback",
          sound: false,
          vibrate: false,
          smallIcon: "notification_icon", // Use Expo's default notification icon
          largeIcon: thumbnailUrl || null, // Use the remote URL directly
          color: "#1DB954",
          autoCancel: false, // Prevent user dismissal
          ongoing: true, // Makes it non-dismissible
          style: thumbnailUrl
            ? {
                type: "bigPicture",
                picture: thumbnailUrl, // Display thumbnail in the expanded notification body
                largeIcon: thumbnailUrl, // Keep largeIcon for the collapsed state
              }
            : undefined,
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
        ios: {
          attachments: thumbnailUrl
            ? [{ url: thumbnailUrl, identifier: "thumbnail" }]
            : [],
        },
      },
      trigger: null,
    });
    console.log("Notification displayed successfully");
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

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
