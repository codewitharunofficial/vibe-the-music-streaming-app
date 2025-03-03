import React, { createContext, useContext, useState, useEffect } from "react";

// Create Context
const PlayerContext = createContext();

// Custom Hook to use the PlayerContext
export const usePlayer = () => useContext(PlayerContext);

// Provider Component
export const PlayerProvider = ({ children }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState();
  const [repeat, setRepeat] = useState(false);
  const [currentQueue, setCurrentQueue] = useState([]);

  useEffect(() => {
    if (status) {
      setCurrentTime(status.currentTime);
      setDuration(status.duration);
    }
  }, [status]);

  // Function to Play
  const play = () => {
    if (sound) {
      sound.playAsync();
      setIsPlaying(true);
    }
  };

  // Function to Pause
  const pause = () => {
    if (sound) {
      sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  // Function to Seek
  const seekTo = (time) => {
    if (sound) {
      sound.setPositionAsync(time);
      setCurrentTime(time);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        sound,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        play,
        pause,
        seekTo,
        setSound,
        repeat,
        setRepeat,
        currentQueue,
        setCurrentQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
