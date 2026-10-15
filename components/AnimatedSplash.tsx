import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";

// ---------------------------------------------------------------------------
// Vibe animated splash screen.
//
// Sequence: the logo (already on screen, matching the native splash) lifts up
// and gives a small pop -> the "Vibe" wordmark slides in -> equalizer bars
// start dancing -> tagline fades in -> once the app is ready (and the minimum
// time has passed) the whole screen fades and scales out.
//
// Place this file at: components/AnimatedSplash.tsx
// ---------------------------------------------------------------------------

export const SPLASH_BG = "#061E2B"; // use the same value in app.json
export const SPLASH_LOGO_SIZE = 140; // use the same value as imageWidth in app.json

const ACCENT = "#FF9F1C";
const BAR_COLORS = ["#FFC14D", ACCENT, "#FF8A00", ACCENT, "#FFC14D"];
const BAR_HEIGHT = 36;
const EXIT_MS = 450;

// One bouncing equalizer bar (scales up and down around its centre)
function Bar({ index, color }: { index: number; color: string }) {
  const scale = useSharedValue(0.25);

  useEffect(() => {
    const duration = 360 + index * 70;
    scale.value = withDelay(
      900 + index * 90,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.25, { duration, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

type Props = {
  /** true once the app has finished loading (fonts, storage, player setup...) */
  ready: boolean;
  /** called after the exit animation, so the parent can unmount the splash */
  onFinish: () => void;
  /** minimum time the splash stays up, in ms */
  minDuration?: number;
};

export default function AnimatedSplash({
  ready,
  onFinish,
  minDuration = 2400,
}: Props) {
  const [minElapsed, setMinElapsed] = useState(false);
  const exiting = useRef(false);

  const logoLift = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.9);
  const titleOpacity = useSharedValue(0);
  const titleShift = useSharedValue(14);
  const barsOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const exit = useSharedValue(0);

  // Intro
  useEffect(() => {
    const out = Easing.out(Easing.cubic);

    glowOpacity.value = withDelay(200, withTiming(1, { duration: 900 }));
    glowScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.92, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    logoLift.value = withDelay(250, withTiming(-52, { duration: 650, easing: out }));
    logoScale.value = withDelay(
      250,
      withSequence(
        withTiming(1.07, { duration: 300, easing: out }),
        withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    titleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    titleShift.value = withDelay(600, withTiming(0, { duration: 500, easing: out }));
    barsOpacity.value = withDelay(850, withTiming(1, { duration: 400 }));
    tagOpacity.value = withDelay(1100, withTiming(1, { duration: 500 }));

    const timer = setTimeout(() => setMinElapsed(true), minDuration);
    return () => clearTimeout(timer);
  }, []);

  // Exit, once the app is ready and the minimum time has passed
  useEffect(() => {
    if (!ready || !minElapsed || exiting.current) return;
    exiting.current = true;

    exit.value = withTiming(1, {
      duration: EXIT_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    const timer = setTimeout(onFinish, EXIT_MS + 30);
    return () => clearTimeout(timer);
  }, [ready, minElapsed]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + exit.value * 0.06 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoLift.value }, { scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleShift.value }],
  }));
  const barsStyle = useAnimatedStyle(() => ({ opacity: barsOpacity.value }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));

  return (
    <Animated.View
      style={[styles.root, rootStyle]}
      // The native splash is hidden once this view has been drawn, so the
      // hand-over has no flash of blank screen.
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Animated.View style={[styles.glow, glowStyle]} />

      <Animated.View style={logoStyle}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="cover"
        />
      </Animated.View>

      <View style={styles.info} pointerEvents="none">
        <Animated.Text style={[styles.title, titleStyle]}>Vibe</Animated.Text>

        <Animated.View style={[styles.bars, barsStyle]}>
          {BAR_COLORS.map((color, i) => (
            <Bar key={i} index={i} color={color} />
          ))}
        </Animated.View>

        <Animated.Text style={[styles.tagline, tagStyle]}>
          Your music, your vibe.
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: SPLASH_BG,
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(255,159,28,0.08)",
  },

  logo: {
    width: SPLASH_LOGO_SIZE,
    height: SPLASH_LOGO_SIZE,
    borderRadius: SPLASH_LOGO_SIZE * 0.24,
  },

  // Sits just below the logo once it has lifted
  info: {
    position: "absolute",
    top: "50%",
    marginTop: 38,
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
  },

  bars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: BAR_HEIGHT,
    marginTop: 16,
  },

  bar: {
    width: 6,
    height: BAR_HEIGHT,
    borderRadius: 3,
  },

  tagline: {
    marginTop: 16,
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    letterSpacing: 0.4,
  },
});