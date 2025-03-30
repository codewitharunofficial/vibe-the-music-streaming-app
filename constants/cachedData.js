import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveToRecentlyPlayed = async (song) => {
  console.log(song);
  try {
    const list = JSON.parse(await AsyncStorage.getItem("recents")) || [];
    const ifExist = list.find((item) => item.videoId === song?.videoId);
    if (!ifExist) {
      list.push(song);
      await AsyncStorage.setItem("recents", JSON.stringify(list));
    } else {
      const itemIndex = list.findIndex(
        (item) => item.videoId === song?.videoId
      );
      list.splice(itemIndex, 1);
      list.push(song);
      await AsyncStorage.setItem("recents", JSON.stringify(list));
    }
  } catch (error) {
    console.log(error);
  }
};

export const getRecentlyPlayed = async (setIsLoading, setSongs) => {
  try {
    setIsLoading(true);
    const list = JSON.parse(await AsyncStorage.getItem("recents")) || [];
    setSongs(list.slice(0, 20));
    setIsLoading(false);
  } catch (error) {
    console.log(error);
    setIsLoading(false);
  }
};


export const mergeRecents = async (remoteRecents) => {
  try {
    // Get local recents from AsyncStorage
    console.log("Remote Recents: ", remoteRecents);
    const localData = await AsyncStorage.getItem('recents');
    const localRecents = localData ? JSON.parse(localData) : [];

    // Merge and avoid duplicates
    const mergedRecents = [...localRecents, ...remoteRecents].reduce((acc, song) => {
      if (!acc.find((item) => item.id === song.id)) {
        acc.push(song);
      }
      return acc;
    }, []);

    // Save the merged recents back to AsyncStorage
    await AsyncStorage.setItem('recents', JSON.stringify(mergedRecents));

    console.log('Recents merged successfully', mergedRecents);
    return mergedRecents;

  } catch (error) {
    console.error('Error merging recents:', error);
  }
};

export const saveToFavourites = async (favourites) => {
  try {
    await AsyncStorage.setItem("favourites", JSON.stringify(favourites));
  } catch (error) {
    console.log(error);
  }
};

export const getFavourites = async () => {
  try {
    const list = JSON.parse(await AsyncStorage.getItem("favourites")) || [];
    if (list) return list;
  } catch (error) {
    console.log(error);
  }
};


export const removeFromFavourites = async (song) => {
  try {
    const list = JSON.parse(await AsyncStorage.getItem('favourites')) || [];

    if (list.length > 0) {
      const itemIndex = list.findIndex(e => e.videoId === song.videoId);

      if (itemIndex !== -1) {
        // Remove the song from the list
        list.splice(itemIndex, 1);

        // Save the updated list back to AsyncStorage
        await AsyncStorage.setItem('favourites', JSON.stringify(list));
        console.log("Updated favourites: ", list);
      }
    }

    return list;

  } catch (error) {
    console.log("Error removing from favourites:", error);
  }
};

export const checkIfLoggedIn = async () => {
  try {
    const storedUser = await AsyncStorage.getItem("userInfo");
    if (storedUser) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error Fetching user:", error);
  }
};
