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
    setSongs(list);
    setIsLoading(false);
  } catch (error) {
    console.log(error);
    setIsLoading(false);
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
