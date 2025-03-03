import React from "react";
import { Modal, View, ActivityIndicator, StyleSheet } from "react-native";

const Loader = ({ isLoading }) => {
    // console.log("Playlist Loading: ", isLoading);
  return (
    <Modal transparent visible={isLoading} animationType="fade">
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="green" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default Loader;
