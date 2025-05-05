import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
  useColorScheme,
  Dimensions,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { useUser } from "@/context/User";
import { router } from "expo-router";
import { mergeRecents, saveToFavourites } from "@/constants/cachedData";
import { useSong } from "@/context/SongContext";
import Loader from "@/components/Loader";

// Complete any pending browser session
WebBrowser.maybeCompleteAuthSession();

const UserProfile = () => {
  const { userInfo, setUserInfo } = useUser();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [authMethod, setAuthMethod] = useState("");
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { currentSong } = useSong();
  const [isLoading, setIsLoading] = useState(false);
  const { height } = Dimensions.get("window");

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: Constants.expoConfig?.extra?.googleSignIn?.androidClientId,
    clientId: Constants.expoConfig?.extra?.googleSignIn?.webClientId,
    redirectUri: `com.codewitharun.vibe:/(tabs)/profile`,
    scopes: ["profile", "email", "openid"],
    usePKCE: true,
  });

  // Handle Google Auth response
  useEffect(() => {
    if (response?.type === "success") {
      fetchUserInfo(response.authentication.accessToken);
    }
  }, [response]);

  // Fetch user info from Google API
  const fetchUserInfo = async (accessToken) => {
    try {
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userData = await response.json();

      if (userData.error) throw new Error(userData.error.message);

      if (authMethod === "Login") {
        await login(userData);
      } else if (authMethod === "SignUp") {
        await signUp(userData);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      Alert.alert("Error", "Failed to fetch user info. Please try again.");
    }
  };

  // Login API Call
  const login = async (userData) => {
    try {
      setIsLoading(true);
      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_API}/api/login`,
        {
          email: userData.email,
        }
      );

      if (data.success) {
        setUserInfo(data.user);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));
        await saveToFavourites(data.user?.favourites);
        await mergeRecents(data.user.recently_played);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        Alert.alert("Login Failed", data.message);
      }
    } catch (error) {
      console.error("Login Error:", error.message);
      setIsLoading(false);
      Alert.alert("Error", "Login failed. Please try again.");
    }
  };

  // Sign-Up API Call
  const signUp = async (userData) => {
    try {
      setIsLoading(true);
      const { data } = await axios.post(
        `${process.env.EXPO_PUBLIC_API}/api/register`,
        {
          email: userData.email,
          name: userData.name,
          profile: userData.picture,
        }
      );

      if (data.success) {
        setUserInfo(data.user);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));
        await saveToFavourites(data.user?.favourites);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        Alert.alert("Registration Failed", data.message);
      }
    } catch (error) {
      console.error("Sign-Up Error:", error);
      setIsLoading(false);
      Alert.alert("Error", "Sign-up failed. Please try again.");
    }
  };

  // Handle Sign-Out
  const handleSignOut = async () => {
    try {
      // await AsyncStorage.removeItem("userInfo");
      // await AsyncStorage.removeItem("recents");
      await AsyncStorage.multiRemove(["userInfo", "recents", "favourites"]);
      setUserInfo(null);
      Alert.alert("Success", "Signed out successfully!");
    } catch (error) {
      console.error("Sign-Out Error:", error);
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: currentSong ? height * 0.1 : 0 },
      ]}
    >
      {userInfo ? (
        <Animated.View style={[styles.profileContainer, { opacity: fadeAnim }]}>
          <Image
            source={{
              uri: userInfo.profilePic || "https://via.placeholder.com/150",
            }}
            style={styles.profilePhoto}
          />
          <Text style={styles.userName}>{userInfo.name || "User"}</Text>
          <Text style={styles.userEmail}>
            {userInfo?.email || "email@example.com"}
          </Text>

          {/* router Buttons */}
          <View style={styles.navButtons}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.navigate({ pathname: "/favourites" })}
            >
              <MaterialIcons name="favorite" size={24} color="#FF4D67" />
              <Text style={styles.navText}>Favourites</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.navigate({ pathname: "/recents/" })}
            >
              <MaterialIcons name="history" size={24} color="#4DA6FF" />
              <Text style={styles.navText}>Recently Played</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.navigate({ pathname: "/soon" })}
            >
              <MaterialIcons
                name="play-circle-fill"
                size={24}
                color="#FFC14D"
              />
              <Text style={styles.navText}>Most Played</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.navigate({ pathname: "/playlists" })}
            >
              <MaterialIcons name="playlist-play" size={24} color="#E600E6" />
              <Text style={styles.navText}>Your Playlists</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : isLoading ? (
        <Loader isLoading={isLoading} />
      ) : (
        <Animated.View style={styles.authCard}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={styles.title}>Welcome to Vibe!</Text>
          <Text style={styles.subtitle}>
            Stream your favorite music anytime, anywhere.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setAuthMethod("Login");
              promptAsync();
            }}
            style={styles.googleButton}
          >
            <AntDesign name="google" size={24} color="#fff" />
            <Text style={styles.buttonText}>Sign In with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setAuthMethod("SignUp");
              promptAsync();
            }}
            style={styles.googleButton}
          >
            <AntDesign name="google" size={24} color="#fff" />
            <Text style={styles.buttonText}>Sign Up with Google</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2F1C6A",
    alignItems: "center",
    justifyContent: "center",
  },

  profileContainer: {
    alignItems: "center",
    backgroundColor: "#1C1C1C",
    borderRadius: 15,
    padding: 30,
    width: "90%",
  },

  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#1C1C1C",
  },

  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    marginTop: 5,
  },

  userEmail: {
    fontSize: 16,
    color: "royalblue",
    marginBottom: 20,
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
    textDecorationColor: "white",
  },

  navButtons: { width: "100%", marginTop: 10 },

  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  navText: { color: "#fff", fontSize: 16, marginLeft: 10 },

  signOutButton: {
    backgroundColor: "#E50914",
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    color: "#fff",
  },
  signOutText: {
    color: "#fff",
  },
  authCard: {
    backgroundColor: "#1C1C1C",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 50,
    objectFit: "cover",
  },

  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 5 },

  subtitle: {
    fontSize: 14,
    color: "#bbb",
    textAlign: "center",
    marginBottom: 20,
  },

  googleButton: {
    width: "100%",
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    elevation: 3,
    marginBottom: 10,
  },

  buttonContent: { flexDirection: "row", alignItems: "center", gap: 10 },

  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default UserProfile;
