import React, { Component } from "react";
import { ImageBackground, Text, useColorScheme, View } from "react-native";

export const AvailableSoon = () => {
  const theme = useColorScheme();

  return (
    <ImageBackground
      source={require("@/assets/images/background.jpg")}
      blurRadius={10}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme === "dark" ? "#fff" : "#000" }}>
          {" "}
          The Screen Will Be Available In Future Updates{" "}
        </Text>
      </View>
    </ImageBackground>
  );
};

export default AvailableSoon;
