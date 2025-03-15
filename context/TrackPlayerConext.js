import React, { createContext, useContext, useState } from "react";

// Create Context
const TrackPlayerContext = createContext();

// Custom Hook to use the Song Context
export const useTrackPlayerService = () => useContext(TrackPlayerContext);

// Provider Component
export const TrackPlayerServiceProvider = ({ children }) => {

  const [isInitialized, setIsInitialized] = useState(false);

  return (
    <TrackPlayerContext.Provider value={{ isInitialized, setIsInitialized }}>
      {children}
    </TrackPlayerContext.Provider>
  );
};
