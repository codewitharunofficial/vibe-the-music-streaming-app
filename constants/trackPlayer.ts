// utils/trackPlayer.ts
import { Platform } from "react-native";

let TrackPlayer: any = {};

if (Platform.OS !== "web") {
  TrackPlayer = require("react-native-track-player");
} else {
  // Dummy methods for web
  TrackPlayer = {
    setupPlayer: async () => {},
    add: async (_: any) => {},
    play: async () => {},
    pause: async () => {},
    reset: async () => {},
    stop: async () => {},
    getState: async () => "stopped",
    // add more mock methods as needed
  };
}

export default TrackPlayer;
