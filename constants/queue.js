import axios from "axios";
import TrackPlayer from "react-native-track-player";

export function moveSong(arr, fromIndex, toIndex) {
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

export const addToRNTPQueue = async (song) => {
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