import React, { createContext, useContext, useState } from "react";

// Create Context
const SongContext = createContext();

// Custom Hook to use the Song Context
export const useSong = () => useContext(SongContext);

// Provider Component
export const SongProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [songUrl, setSongUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSongLoading, setIsSongLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Function to play a new song
  const playSong = (song) => {
    setIsSongLoading(true);
    setCurrentSong(song);
    setSongUrl(song.url);

    // Simulate loading delay
    setTimeout(() => {
      setIsSongLoading(false);
      setIsPlaying(true);
    }, 1000);
  };

  // Function to toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <SongContext.Provider
      value={{
        currentSong,
        setCurrentSong,
        songUrl,
        setSongUrl,
        setIsPlaying,
        isPlaying,
        isSongLoading,
        setIsSongLoading,
        playSong,
        togglePlayPause,
        open,
        setOpen,
        isModalOpen,
        setIsModalOpen,
        selectedTrack, setSelectedTrack
      }}
    >
      {children}
    </SongContext.Provider>
  );
};
