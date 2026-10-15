import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
  Dimensions,
  ImageBackground,
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
import { reloadHome } from "@/constants/apiCalls";

// Complete any pending browser session
WebBrowser.maybeCompleteAuthSession();

const APP_ICON = require("@/assets/images/icon.png");

// Design tokens (same palette as the rest of the app)
const UI = {
  surface: "#0B3047",
  accent: "#FF9F1C",
  glass: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.10)",
  textHi: "#FFFFFF",
  textMid: "rgba(255,255,255,0.72)",
  textLow: "rgba(255,255,255,0.45)",
  scrim: "rgba(4,24,35,0.55)",
  danger: "#FF6B81",
};

// One row of the profile menu (presentation only)
const NavRow = ({ icon, color, label, onPress, last }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={[styles.navButton, last && styles.navButtonLast]}
    onPress={onPress}
  >
    <View style={[styles.navIconWrap, { backgroundColor: `${color}26` }]}>
      <MaterialIcons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.navText}>{label}</Text>
    <MaterialIcons name="chevron-right" size={22} color={UI.textLow} />
  </TouchableOpacity>
);

const UserProfile = () => {
  const { userInfo, setUserInfo } = useUser();
  const [fadeAnim] = useState(new Animated.Value(0));
  // A ref (not state) so the value is always current when Google responds
  const authMethodRef = useRef("");
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
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        fetchUserInfo(accessToken);
      } else {
        Alert.alert("Error", "Google did not return an access token.");
      }
    } else if (response?.type === "error") {
      Alert.alert("Error", "Google sign-in failed. Please try again.");
    }
  }, [response]);

  // Fetch user info from Google API
  const fetchUserInfo = async (accessToken) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const userData = await response.json();

      if (userData.error) throw new Error(userData.error.message);

      if (authMethodRef.current === "SignUp") {
        await signUp(userData);
      } else {
        await login(userData);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      setIsLoading(false);
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
        },
      );

      if (data.success) {
        setUserInfo(data.user);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));
        await saveToFavourites(data.user?.favourites || []);
        await mergeRecents(data.user.recently_played);
        await reloadHome(setIsLoading, data.user.email || " ");
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
        },
      );

      if (data.success) {
        setUserInfo(data.user);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));
        await saveToFavourites(data.user?.favourites || []);
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

  // Sign-Out (asks first, then clears everything tied to the account,
  // including the cached personalised home feed and playlists)
  const handleSignOut = () => {
    Alert.alert("Sign out", "Do you want to sign out of Vibe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              "userInfo",
              "recents",
              "favourites",
              "home",
              "home_updated_at",
              "user-playlists",
            ]);
            setUserInfo(null);
          } catch (error) {
            console.error("Sign-Out Error:", error);
            Alert.alert("Error", "Failed to sign out.");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ImageBackground
      source={require("@/assets/images/background.jpg")}
      blurRadius={10}
      style={{ flex: 1 }}
    >
      {/* Dark wash so the cards read well on any background */}
      <View pointerEvents="none" style={styles.scrim} />
      <View
        style={[
          styles.container,
          { paddingBottom: currentSong ? height * 0.1 : 0 },
        ]}
      >
        {userInfo ? (
          <Animated.View
            style={[styles.profileContainer, { opacity: fadeAnim }]}
          >
            <View style={styles.avatarRing}>
              <Image
                source={
                  userInfo.profilePic
                    ? { uri: userInfo.profilePic }
                    : APP_ICON
                }
                style={styles.profilePhoto}
              />
            </View>
            <Text style={styles.userName}>{userInfo.name || "User"}</Text>
            <Text style={styles.userEmail}>
              {userInfo?.email || "email@example.com"}
            </Text>

            {/* router Buttons */}
            <View style={styles.navButtons}>
              <NavRow
                icon="favorite"
                color="#FF4D67"
                label="Favourites"
                onPress={() => router.navigate({ pathname: "/favourites" })}
              />
              <NavRow
                icon="history"
                color="#4DA6FF"
                label="Recently Played"
                onPress={() => router.navigate({ pathname: "/recents/" })}
              />
              <NavRow
                icon="play-circle-fill"
                color="#FFC14D"
                label="Most Played"
                onPress={() => router.navigate({ pathname: "/soon" })}
              />
              <NavRow
                icon="playlist-play"
                color="#E600E6"
                label="Your Playlists"
                onPress={() => router.navigate({ pathname: "/playlists" })}
                last
              />
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <MaterialIcons name="logout" size={20} color={UI.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : isLoading ? (
          <Loader isLoading={isLoading} />
        ) : (
          <Animated.View style={[styles.authCard, { opacity: fadeAnim }]}>
            <Image
              source={APP_ICON}
              style={styles.logo}
              resizeMode="cover"
            />
            <Text style={styles.title}>Welcome to Vibe!</Text>
            <Text style={styles.subtitle}>
              Stream your favorite music anytime, anywhere.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!request}
              onPress={() => {
                authMethodRef.current = "Login";
                promptAsync();
              }}
              style={[styles.googleButton, !request && styles.buttonDisabled]}
            >
              <AntDesign name="google" size={22} color="#DB4437" />
              <Text style={styles.buttonText}>Sign In with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!request}
              onPress={() => {
                authMethodRef.current = "SignUp";
                promptAsync();
              }}
              style={[
                styles.googleButton,
                styles.googleButtonSecondary,
                !request && styles.buttonDisabled,
              ]}
            >
              <AntDesign name="google" size={22} color={UI.textHi} />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                Sign Up with Google
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.scrim,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ----- Signed in ----- */
  profileContainer: {
    alignItems: "center",
    backgroundColor: UI.surface,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    width: "90%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },

  avatarRing: {
    padding: 4,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: UI.accent,
    marginBottom: 14,
  },

  profilePhoto: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#124562",
  },

  userName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: UI.textHi,
    marginBottom: 4,
  },

  userEmail: {
    fontSize: 14,
    color: UI.textMid,
    marginBottom: 22,
  },

  navButtons: {
    width: "100%",
    backgroundColor: UI.glass,
    borderRadius: 18,
    paddingHorizontal: 14,
  },

  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.hairline,
  },

  navButtonLast: {
    borderBottomWidth: 0,
  },

  navIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    flex: 1,
    color: UI.textHi,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 14,
  },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,107,129,0.55)",
    backgroundColor: "rgba(255,107,129,0.12)",
  },

  signOutText: {
    color: UI.danger,
    fontSize: 15,
    fontWeight: "700",
  },

  /* ----- Signed out ----- */
  authCard: {
    backgroundColor: UI.surface,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: "90%",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },

  logo: {
    width: 88,
    height: 88,
    marginBottom: 20,
    borderRadius: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: UI.textHi,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI.textMid,
    textAlign: "center",
    marginBottom: 26,
  },

  googleButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    elevation: 3,
    marginBottom: 12,
  },

  googleButtonSecondary: {
    backgroundColor: UI.glass,
    borderWidth: 1,
    borderColor: UI.hairline,
    elevation: 0,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: { color: "#1F1F1F", fontSize: 16, fontWeight: "700" },

  buttonTextSecondary: { color: UI.textHi },
});

export default UserProfile;