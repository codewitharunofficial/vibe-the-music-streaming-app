import axios from "axios";

export const handleLiked = async (email, song) => {
    try {
        const { data } = await axios.post(
            `${process.env.EXPO_PUBLIC_API}/api/favourites`,
            { email: email, song: song }
        );
        if (data.success) {
            return data;
        } else {
            console.log(data.message);
        }
    } catch (error) {
        console.log(error);
    }
};