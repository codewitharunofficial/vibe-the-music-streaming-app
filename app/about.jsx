import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  Linking,
  Image,
} from "react-native";

// ⬇️ Replace these with your real info
const DEVELOPER = {
  name: "Ravi (Arun)",
  role: "Creator & Developer",
  avatar: require("@/assets/images/Profile.png"), // replace with your GitHub avatar URL, or use require('./assets/avatar.png')
  github: "https://github.com/codewitharunofficial",
  linkedin: "https://linkedin.com/in/ravi5320",
};

export default function AboutScreen() {
  const openLink = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🎵</Text>
        <Text style={styles.title}>Vibe</Text>
        <Text style={styles.subtitle}>
          Discover Music. Share Moments. Feel the Vibe.
        </Text>
      </View>

      {/* Mission */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.text}>
          Music has always connected people. Vibe was created to make sharing
          music as easy and engaging as sharing a message.
        </Text>
        <Text style={styles.text}>
          Whether you've discovered a hidden gem, a nostalgic favorite, or the
          perfect song for the moment, Vibe helps you share it instantly with
          friends and fellow music lovers.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why Vibe?</Text>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>⚡ Instant Song Sharing</Text>
          <Text style={styles.featureText}>
            Share songs with a single tap and let friends listen instantly.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🎧 Personalized Experience</Text>
          <Text style={styles.featureText}>
            Build your own musical identity through your favorite tracks and
            listening habits.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🌍 Social Discovery</Text>
          <Text style={styles.featureText}>
            Discover new songs through friends, trends, and community activity.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🚀 Seamless Listening</Text>
          <Text style={styles.featureText}>
            Enjoy a smooth music experience designed for speed and simplicity.
          </Text>
        </View>
      </View>

      {/* Vision */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Vision</Text>
        <Text style={styles.text}>
          We believe every song tells a story, and every listener has one worth
          sharing.
        </Text>
        <Text style={styles.text}>
          Our goal is to create a community where music becomes more than
          entertainment—it becomes a way to connect, express yourself, and
          discover meaningful moments with others.
        </Text>
      </View>

      {/* Credits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credits</Text>

        <View style={styles.profileCard}>
          <Image source={DEVELOPER.avatar} style={styles.avatar} />

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{DEVELOPER.name}</Text>
            <Text style={styles.profileRole}>{DEVELOPER.role}</Text>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openLink(DEVELOPER.github)}
                activeOpacity={0.7}
              >
                <Text style={styles.socialIcon}>🐙</Text>
                <Text style={styles.socialText}>GitHub</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => openLink(DEVELOPER.linkedin)}
                activeOpacity={0.7}
              >
                <Text style={styles.socialIcon}>💼</Text>
                <Text style={styles.socialText}>LinkedIn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.text}>
          Built with React Native. Icons and design inspired by the open-source
          community. Thank you to everyone who contributed feedback and ideas
          along the way.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>
          Thank you for being part of Vibe ❤️
        </Text>
        <Text style={styles.footerText}>
          Keep listening. Keep sharing. Stay in the Vibe.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  text: {
    color: "#C9D1D9",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10,
  },
  featureCard: {
    backgroundColor: "#161B22",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  featureTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  featureText: {
    color: "#9CA3AF",
    lineHeight: 22,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161B22",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 14,
    backgroundColor: "#21262D",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  profileRole: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: "row",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#21262D",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  socialIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  socialText: {
    color: "#C9D1D9",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
    paddingTop: 20,
  },
  footerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  footerText: {
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#21262D",
    marginVertical: 24,
  },
  version: {
    color: "#6B7280",
    fontSize: 13,
  },
});
