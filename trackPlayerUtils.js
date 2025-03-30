import axios from "axios";
import TrackPlayer from "react-native-track-player";

export function updateServiceData(queue, user, index) {
    currentQueue = queue || [];
    userInfo = user || null;
    currentIndex = index || 0;
    console.log("trackPlayerUtils.updateServiceData called:", {
        currentIndex,
        queueLength: currentQueue.length,
    });
}

export function getServiceData() {
    return { currentQueue, userInfo, currentIndex };
}

export async function fetchAndQueueNextTrack(trackToQueue, email) {
    try {
        const queue = await TrackPlayer.getQueue();
        console.log("Current RNTP queue:", queue.map((t) => t.id));

        if (queue.some((t) => t.id === trackToQueue.videoId)) {
            console.log("Next track already in queue:", trackToQueue.title);
            return;
        }

        console.log("Fetching next track:", trackToQueue.title);
        const { data } = await axios.post(
            `${process.env.EXPO_PUBLIC_API}/api/song`,
            { id: trackToQueue.videoId, song: trackToQueue, email }
        );

        if (data?.song) {
            const newTrack = {
                id: trackToQueue.videoId,
                url: data.song.adaptiveFormats[data.song.adaptiveFormats.length - 1]?.url,
                title: trackToQueue.title,
                artist: trackToQueue.author,
                artwork: data.song.thumbnail[data.song.thumbnail?.length - 1]?.url || trackToQueue.thumbnail,
            };
            await TrackPlayer.add(newTrack);
            console.log("Queued next track:", newTrack.url);
            const updatedQueue = await TrackPlayer.getQueue();
            console.log("Updated RNTP queue:", updatedQueue.map((t) => t.title));
        } else {
            console.warn("No song data returned from API");
        }
    } catch (error) {
        console.error("Error prefetching next track:", error.message);
    }
};