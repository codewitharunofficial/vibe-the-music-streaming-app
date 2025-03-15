import React, { createContext, useContext, useState } from "react";

// Create Context
const PlaylistContext = createContext();

// Custom Hook to use the Song Context
export const usePlaylist = () => useContext(PlaylistContext);

// Provider Component
export const PlaylistProvider = ({ children }) => {
  const [playlist, setPlaylist] = useState(null);
  const [album, setAlbum] = useState(null);

  return (
    <PlaylistContext.Provider value={{ playlist, setPlaylist, album, setAlbum }}>
      {children}
    </PlaylistContext.Provider>
  );
};
