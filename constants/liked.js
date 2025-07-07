import axios from "axios";

export const handleLiked = async (email, song) => {
  try {
    const { data } = await axios.post(
      `${process.env.EXPO_PUBLIC_API}/api/favourites`,
      { email, song }
    );

    if (data.success && data.favourites) {
      return data; // Expect data.favourites array from server
    } else {
      throw new Error(data.message || "Failed to update favourites");
    }
  } catch (error) {
    console.error("handleLiked error:", error);
    throw error; // propagate to caller
  }
};