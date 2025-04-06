import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import moment from "moment";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

const UpdatesScreen = () => {
  const { height, width } = Dimensions.get("window");
  const theme = useColorScheme();

  const textColor =
    theme === "dark" ? DarkTheme.colors.text : DefaultTheme.colors.text;
  const reloadButton =
    theme === "dark" ? DarkTheme.colors.primary : DefaultTheme.colors.primary;

  const [updateInfo, setUpdateInfo] = useState({
    isUpdateAvailable: false,
    isDownloading: false,
    downloadedUpdate: null,
  });

  // Check for updates
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateInfo((prev) => ({
            ...prev,
            isUpdateAvailable: true,
          }));
        }
      } catch (error) {
        console.log("Error checking for updates:", error);
      }
    };

    checkForUpdates();
  }, []);

  // Function to download the update
  const handleDownloadUpdate = async () => {
    try {
      setUpdateInfo((prev) => ({ ...prev, isDownloading: true }));

      const update = await Updates.fetchUpdateAsync();
      if (update.isNew) {
        setUpdateInfo((prev) => ({
          ...prev,
          downloadedUpdate: update,
        }));
      }
    } catch (error) {
      console.log("Error downloading update:", error);
    } finally {
      setUpdateInfo((prev) => ({ ...prev, isDownloading: false }));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: textColor }]}>Updates</Text>

      {/* Current Version Info */}
      <View style={styles.infoBox}>
        <Text style={{ color: textColor }}>
          Running Version: {Updates.runtimeVersion}
        </Text>
        <Text style={{ color: textColor }}>
          Last Updated: {moment(Updates.creationTime).format("DD-MM-YYYY")}
        </Text>
      </View>

      {/* Show Downloaded Update Info */}
      {updateInfo.downloadedUpdate && (
        <Text style={{ color: textColor, marginTop: 10 }}>
          Update Released On:{" "}
          {moment(updateInfo.downloadedUpdate.creationTime).format(
            "DD-MM-YYYY"
          )}
        </Text>
      )}

      {/* Download Update Button */}
      {updateInfo.isUpdateAvailable && !updateInfo.downloadedUpdate && (
        <TouchableOpacity
          onPress={handleDownloadUpdate}
          style={[styles.button, { backgroundColor: "lightgreen" }]}
          disabled={updateInfo.isDownloading}
        >
          <Text style={{ color: textColor }}>
            {updateInfo.isDownloading ? "Downloading..." : "Download Update"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Reload Button to Apply Update */}
      {updateInfo.downloadedUpdate && (
        <TouchableOpacity
          onPress={() => Updates.reloadAsync()}
          style={[styles.button, { backgroundColor: reloadButton }]}
        >
          <Text style={{ color: textColor }}>Reload to Apply Update</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default UpdatesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: '#2F1C6A',
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "serif",
  },
  infoBox: {
    marginTop: 10,
    alignItems: "center",
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
});
