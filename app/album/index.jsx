import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { handleRecentlyPlayed, playASongs } from "@/constants/apiCalls";
import { useSong } from "@/context/SongContext";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylist } from "@/context/Playlist";
import { saveToRecentlyPlayed } from "@/constants/cachedData";
import { useUser } from "@/context/User";
import { TrackComponent } from "@/components/Component";

const AlbumScreen = () => {
  const { album } = usePlaylist();

  const { setSongUrl, setIsSongLoading, setCurrentSong, currentSong } =
    useSong();
  const { currentQueue, setCurrentQueue } = usePlayer();
  const { userInfo, setUserInfo } = useUser();

  return (
    <View style={styles.container}>
      {/* Playlist Details */}
      <View style={styles.header}>
        <Image source={{ uri: album?.albumCover }} style={styles.coverImage} />
        <View style={styles.details}>
          <Text style={styles.title}>{album?.title?.trim()}</Text>
          <Text style={styles.author}>{album?.albumAuthor}</Text>
          <Text style={styles.release}>{album?.albumRelease}</Text>
          <Text style={styles.release}>{album?.albumTotalSong}</Text>
          <Text numberOfLines={8} style={styles.description}>
            {album?.albumDescription}
          </Text>
        </View>
      </View>

      {/* Songs List */}
      <FlatList
        data={album.results}
        keyExtractor={(item) => item?.videoId.toString()}
        renderItem={({ item, index }) => (
          <TrackComponent
            item={item}
            songs={album.results}
            setCurrentQueue={setCurrentQueue}
            setCurrentSong={setCurrentSong}
            setIsSongLoading={setIsSongLoading}
            setSongUrl={setSongUrl}
            index={index}
            userInfo={userInfo}
            playingFrom={"Albums"}
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#457B9D",
    flexDirection: "row",
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

export default AlbumScreen;
