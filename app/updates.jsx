import {
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import moment from "moment";
import { MaterialIcons } from "@expo/vector-icons";

// Design tokens (same palette as the rest of the app)
const UI = {
  surface: "#0B3047",
  ink: "#061E2B",
  accent: "#FF9F1C",
  good: "#3DDC97",
  bad: "#FF6B81",
  glass: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.10)",
  textHi: "#FFFFFF",
  textMid: "rgba(255,255,255,0.72)",
  textLow: "rgba(255,255,255,0.45)",
  scrim: "rgba(4,24,35,0.55)",
};

// Release notes live in app.json -> expo.extra.releaseNotes (a string or an
// array of strings). They travel inside the update's manifest, so the notes of
// an update you haven't installed yet can be shown before downloading it.
const normalizeNotes = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};
const notesFromManifest = (manifest) =>
  normalizeNotes(manifest?.extra?.expoClient?.extra?.releaseNotes);

const formatDate = (value) => (value ? moment(value).format("DD MMM YYYY") : null);

const Row = ({ label, value, last }) => (
  <View style={[styles.row, last && styles.rowLast]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const UpdatesScreen = () => {
  const [updateInfo, setUpdateInfo] = useState({
    isUpdateAvailable: false,
    isDownloading: false,
    downloadedUpdate: null,
  });
  const [availableManifest, setAvailableManifest] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  // Check for updates (on open, on pull-to-refresh and from the button)
  const checkForUpdates = async () => {
    // Update checks only work in release builds
    if (!Updates.isEnabled) return;

    try {
      setIsChecking(true);
      setCheckError(null);
      const update = await Updates.checkForUpdateAsync();
      setLastChecked(new Date());

      if (update.isAvailable) {
        setAvailableManifest(update.manifest ?? null);
        setUpdateInfo((prev) => ({ ...prev, isUpdateAvailable: true }));
      } else {
        setAvailableManifest(null);
        setUpdateInfo((prev) => ({ ...prev, isUpdateAvailable: false }));
      }
    } catch (error) {
      console.log("Error checking for updates:", error);
      setCheckError(
        "Couldn't reach the update server. Check your connection and try again.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  // Function to download the update
  const handleDownloadUpdate = async () => {
    try {
      setCheckError(null);
      setUpdateInfo((prev) => ({ ...prev, isDownloading: true }));

      const update = await Updates.fetchUpdateAsync();
      if (update.isNew) {
        setUpdateInfo((prev) => ({
          ...prev,
          downloadedUpdate: update,
        }));
      } else {
        // Nothing new to fetch, so we are already on the latest version
        setUpdateInfo((prev) => ({ ...prev, isUpdateAvailable: false }));
      }
    } catch (error) {
      console.log("Error downloading update:", error);
      setCheckError("The download failed. Please try again.");
    } finally {
      setUpdateInfo((prev) => ({ ...prev, isDownloading: false }));
    }
  };

  const handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.log("Error reloading:", error);
      setCheckError("Couldn't restart the app. Please close and reopen it.");
    }
  };

  // ---------------------------------------------------------------- state --
  let status = "upToDate";
  if (!Updates.isEnabled) status = "disabled";
  else if (updateInfo.downloadedUpdate) status = "ready";
  else if (updateInfo.isDownloading) status = "downloading";
  else if (isChecking) status = "checking";
  else if (checkError) status = "error";
  else if (updateInfo.isUpdateAvailable) status = "available";

  const pendingManifest = updateInfo.downloadedUpdate?.manifest ?? availableManifest;
  const releasedOn = formatDate(pendingManifest?.createdAt);

  const hero = {
    disabled: {
      icon: "build",
      color: UI.textMid,
      title: "Updates unavailable",
      text: "Over-the-air updates are turned off in development builds.",
    },
    checking: {
      color: UI.accent,
      title: "Checking for updates",
      text: "Looking for the latest version…",
    },
    downloading: {
      color: UI.accent,
      title: "Downloading update",
      text: "Hang tight, this only takes a moment.",
    },
    ready: {
      icon: "check-circle",
      color: UI.good,
      title: "Update ready",
      text: "Restart Vibe to start using the new version.",
    },
    error: {
      icon: "error-outline",
      color: UI.bad,
      title: "Something went wrong",
      text: checkError,
    },
    available: {
      icon: "cloud-download",
      color: UI.accent,
      title: "Update available",
      text: releasedOn
        ? `A new version released on ${releasedOn} is ready to download.`
        : "A new version is ready to download.",
    },
    upToDate: {
      icon: "verified",
      color: UI.good,
      title: "You're up to date",
      text: lastChecked
        ? `Last checked at ${moment(lastChecked).format("h:mm A")}.`
        : "You're running the latest version.",
    },
  }[status];

  // Primary action under the status card
  const action = {
    available: {
      label: "Download Update",
      onPress: handleDownloadUpdate,
      primary: true,
    },
    ready: { label: "Restart to Apply", onPress: handleReload, primary: true },
    error: { label: "Try Again", onPress: checkForUpdates, primary: true },
    upToDate: {
      label: "Check for Updates",
      onPress: checkForUpdates,
      primary: false,
    },
  }[status];

  // ---------------------------------------------------------- what's new --
  const pendingNotes = notesFromManifest(pendingManifest);
  const currentNotes = normalizeNotes(Constants.expoConfig?.extra?.releaseNotes);
  const showingPending = pendingNotes.length > 0;
  const notes = showingPending ? pendingNotes : currentNotes;
  const notesTitle = showingPending
    ? "What's new in this update"
    : "What's new in this version";

  // -------------------------------------------------------- version info --
  const appVersion = Constants.expoConfig?.version;
  const details = [
    appVersion && { label: "App version", value: appVersion },
    Updates.runtimeVersion && {
      label: "Runtime version",
      value: String(Updates.runtimeVersion),
    },
    Updates.channel && { label: "Channel", value: Updates.channel },
    {
      label: "Running",
      value: Updates.isEmbeddedLaunch ? "Built-in version" : "Downloaded update",
    },
    Updates.updateId && {
      label: "Update ID",
      value: String(Updates.updateId).slice(0, 8),
    },
    Updates.creationTime && {
      label: "Last updated",
      value: formatDate(Updates.creationTime),
    },
  ].filter(Boolean);

  const busy = status === "checking" || status === "downloading";

  return (
    <ImageBackground
      source={require("@/assets/images/background.jpg")}
      blurRadius={10}
      style={{ flex: 1 }}
    >
      {/* Dark wash so the cards read well on any background */}
      <View pointerEvents="none" style={styles.scrim} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isChecking}
            onRefresh={checkForUpdates}
            tintColor={UI.accent}
            colors={[UI.accent]}
            progressBackgroundColor={UI.surface}
          />
        }
      >
        <Text style={styles.header}>Updates</Text>

        {/* Status */}
        <View style={styles.card}>
          <View style={styles.heroIcon}>
            {busy ? (
              <ActivityIndicator size="large" color={hero.color} />
            ) : (
              <MaterialIcons name={hero.icon} size={44} color={hero.color} />
            )}
          </View>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          {!!hero.text && <Text style={styles.heroText}>{hero.text}</Text>}

          {action && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={action.onPress}
              style={[
                styles.button,
                action.primary ? styles.buttonPrimary : styles.buttonGhost,
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  action.primary ? styles.buttonTextPrimary : styles.buttonTextGhost,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* What's new */}
        {notes.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="new-releases" size={18} color={UI.accent} />
              <Text style={styles.cardTitle}>{notesTitle}</Text>
            </View>
            {notes.map((note, i) => (
              <View key={i} style={styles.noteRow}>
                <View style={styles.noteDot} />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Version details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info-outline" size={18} color={UI.accent} />
            <Text style={styles.cardTitle}>Version details</Text>
          </View>
          {details.map((item, i) => (
            <Row
              key={item.label}
              label={item.label}
              value={item.value}
              last={i === details.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default UpdatesScreen;

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI.scrim,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  header: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: UI.textHi,
    marginTop: 4,
  },

  card: {
    backgroundColor: UI.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },

  // Status card
  heroIcon: {
    alignSelf: "center",
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: UI.glass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  heroTitle: {
    textAlign: "center",
    color: UI.textHi,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  heroText: {
    textAlign: "center",
    color: UI.textMid,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  button: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonPrimary: {
    backgroundColor: UI.accent,
  },

  buttonGhost: {
    backgroundColor: UI.glass,
    borderWidth: 1,
    borderColor: UI.hairline,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },

  buttonTextPrimary: { color: UI.ink },

  buttonTextGhost: { color: UI.textHi },

  // Cards with a title
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  cardTitle: {
    color: UI.textHi,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  // Release notes
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 5,
  },

  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.accent,
    marginTop: 8,
  },

  noteText: {
    flex: 1,
    color: UI.textMid,
    fontSize: 14,
    lineHeight: 21,
  },

  // Version details
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.hairline,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  rowLabel: {
    color: UI.textLow,
    fontSize: 14,
  },

  rowValue: {
    flexShrink: 1,
    marginLeft: 16,
    color: UI.textHi,
    fontSize: 14,
    fontWeight: "600",
  },
});