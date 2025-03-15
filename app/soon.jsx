import React, { Component } from "react";
import { Text, useColorScheme, View } from "react-native";

export const AvailableSoon = () => {
  const theme = useColorScheme();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{color: theme === 'dark' ? '#fff' : '#000'}} > The Screen Will Be Available In Future Updates </Text>
    </View>
  );
};

export default AvailableSoon;
