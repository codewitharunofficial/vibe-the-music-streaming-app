import TrackPlayer, { Event } from "react-native-track-player";
import * as Linking from "expo-linking";
import eventEmitter from "@/eventEmitter";

export const trackPlayerService = async function () {
  console.log("TrackPlayer service loaded"); // Add this line

  // Handle Play action from notification
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("RemotePlay triggered");
    await TrackPlayer.play();
    await Linking.openURL("vibe://(tabs)");
  });

  // Handle Pause action from notification
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("RemotePause triggered");
    await TrackPlayer.pause();
  });

  // Handle Next action from notification
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      console.log("RemoteNext triggered");
      const queue = await TrackPlayer.getQueue();
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      if (currentTrackIndex < queue.length - 1) {
        await TrackPlayer.skipToNext();
      }
      eventEmitter.emit("playNext");
    } catch (error) {
      console.error("Error handling remote-next:", error);
    }
  });

  // Handle Previous action from notification
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      console.log("RemotePrevious triggered");
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      if (currentTrackIndex > 0) {
        await TrackPlayer.skipToPrevious();
      }
      eventEmitter.emit("playPrev");
    } catch (error) {
      console.error("Error handling remote-previous:", error);
    }
  });

  // Handle track changes to emit an event
  TrackPlayer.addEventListener(
    Event.PlaybackActiveTrackChanged,
    async (event) => {
      console.log("PlaybackActiveTrackChanged event:", event);
      const track = await TrackPlayer.getActiveTrack();
      if (track) {
        eventEmitter.emit("trackChanged", track);
        console.log("Track changed to:", track.title);
      }
    }
  );

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    console.log("Playback state changed to:", event.state);
  });
};
