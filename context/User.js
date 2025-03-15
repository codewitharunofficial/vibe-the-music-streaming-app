import React, { createContext, useContext, useState } from "react";

const UserConext = createContext();

export const useUser = () => useContext(UserConext);

export const UserProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [playlistName, setPlaylistName] = useState("");
  const [userPlaylist, setUserPlaylist] = useState([]);

  return (
    <UserConext.Provider
      value={{
        userInfo,
        setUserInfo,
        playlist,
        setPlaylist,
        playlistName,
        setPlaylistName,
        userPlaylist,
        setUserPlaylist,
      }}
    >
      {children}
    </UserConext.Provider>
  );
};
