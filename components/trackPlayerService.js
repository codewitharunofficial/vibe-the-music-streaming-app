import TrackPlayer, { Event } from "react-native-track-player";
import { getServiceData, fetchAndQueueNextTrack } from "../trackPlayerUtils";

const updateRecentlyPlayed = async (email, song) => {
  console.log("Recently played (background):", song.title);
  // Implement your logic here
};

module.exports = async function () {
  const { currentQueue, userInfo, currentIndex: initialIndex } = getServiceData();
  let currentIndex = initialIndex;

  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious()
  );

  Device

  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    console.log("RemoteSeek triggered with position:", position);

    if (typeof position !== "number" || isNaN(position)) {
      console.error("Invalid position value:", position);
      return;
    }

    const { duration } = await TrackPlayer.getProgress();
    console.log("Current duration:", duration);

    if (position < 0 || position > duration) {
      console.warn("Position out of bounds:", position, "Duration:", duration);
      return;
    }

    const state = await TrackPlayer.getState(); // Updated to getState()
    console.log("Player state before seek:", state);

    try {
      await TrackPlayer.seekTo(position);
      const { position: newPosition } = await TrackPlayer.getProgress();
      console.log("Seek successful, new position:", newPosition);

      // Resume playback if paused
      if (state === TrackPlayer.State.Paused) {
        await TrackPlayer.play();
        console.log("Resumed playback after seek");
      }
    } catch (error) {
      console.error("Seek failed:", error.message);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (data) => {
    console.log("PlaybackActiveTrackChanged:", data);

    const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
    if (activeTrackIndex === undefined || !data.track) {
      console.log("No active track or data.track missing");
      return;
    }

    const activeTrack = await TrackPlayer.getTrack(activeTrackIndex);
    if (!activeTrack) {
      console.log("Could not fetch active track");
      return;
    }

    const { currentQueue, userInfo } = getServiceData();
    const newSongIndex = currentQueue.findIndex(
      (s) => s.videoId === activeTrack.id
    );

    if (newSongIndex !== -1) {
      currentIndex = newSongIndex;
      console.log("Track switched to:", currentQueue[newSongIndex].title);

      if (userInfo?.email) {
        await updateRecentlyPlayed(userInfo.email, currentQueue[newSongIndex]);
      } else {
        await updateRecentlyPlayed(null, currentQueue[newSongIndex]);
      }

      const nextIndex = newSongIndex + 1;
      if (nextIndex < currentQueue.length) {
        console.log("Prefetching next track at index:", nextIndex);
        await fetchAndQueueNextTrack(currentQueue[nextIndex], userInfo?.email);
      } else {
        console.log("No more tracks to prefetch in currentQueue");
      }
    } else {
      console.warn("Track ID not found in currentQueue:", activeTrack.id);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    console.log("PlaybackQueueEnded triggered");
    const queue = await TrackPlayer.getQueue();
    const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
    console.log("RNTP queue:", queue.map((t) => t.id), "Active index:", activeTrackIndex);

    const { currentQueue, userInfo } = getServiceData();
    console.log("currentQueue length:", currentQueue.length, "currentIndex:", currentIndex);

    if (activeTrackIndex < queue.length - 1) {
      console.log("RNTP has more tracks, should play next automatically");
    } else if (currentIndex + 1 < currentQueue.length) {
      console.log("Fetching and queuing next track from currentQueue");
      await fetchAndQueueNextTrack(currentQueue[currentIndex + 1], userInfo?.email);
      await TrackPlayer.skipToNext();
      console.log("Skipped to next track");
    } else {
      console.log("No more tracks in currentQueue, resetting player");
      await TrackPlayer.reset();
    }
  });
};