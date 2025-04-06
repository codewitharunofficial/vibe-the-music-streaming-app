import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { handleRecentlyPlayed, playASongs } from "@/constants/apiCalls";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylist } from "@/context/Playlist";
import { useUser } from "@/context/User";
import { saveToRecentlyPlayed } from "@/constants/cachedData";
import { TrackComponent } from "@/components/Component";

const PlaylistScreen = () => {
  const { playlist } = usePlaylist();

  const { setSongUrl, setIsSongLoading, setCurrentSong, currentSong } =
    useSong();
  const { currentQueue, setCurrentQueue } = usePlayer();
  const { userInfo, setUserInfo } = useUser();

  return (
    <View style={styles.container}>
      {/* Playlist Details */}
      <View style={styles.header}>
        <Image
          source={{ uri: playlist?.playlistCover }}
          style={styles.coverImage}
        />
        <View style={styles.details}>
          <Text style={styles.title}>{playlist?.title}</Text>
          <Text style={styles.author}>{playlist?.playlistAuthor}</Text>
          <Text style={styles.release}>{playlist?.playlistRelease}</Text>
          <Text style={styles.description}>
            {playlist?.playlistDescription}
          </Text>
        </View>
      </View>

      {/* Songs List */}
      <FlatList
        data={playlist.results}
        keyExtractor={(item) => item?.videoId.toString()}
        renderItem={({ item, index }) => (
          <TrackComponent
            item={item}
            songs={playlist.results}
            setCurrentQueue={setCurrentQueue}
            setCurrentSong={setCurrentSong}
            setIsSongLoading={setIsSongLoading}
            setSongUrl={setSongUrl}
            index={index}
            userInfo={userInfo}
            playingFrom={"Playlists"}
          />
        )}
        contentContainerStyle={{ flexDirection: "column-reverse" }}
        scrollEnabled={true}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2F1C6A",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    marginBottom: 20,
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  details: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  author: {
    fontSize: 14,
    color: "#bbb",
  },
  release: {
    fontSize: 14,
    color: "#bbb",
  },
  description: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 5,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#457B9D",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    gap: 10,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  songTitle: {
    fontSize: 16,
    color: "#fff",
  },
  songArtist: {
    fontSize: 14,
    color: "#bbb",
  },
});

export default PlaylistScreen;
