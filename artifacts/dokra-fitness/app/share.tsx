import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  ImageBackground,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ViewShot from "react-native-view-shot";
import { useColors } from "@/hooks/useColors";
import { WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";
import { formatDistance, formatDuration, formatPace } from "@/utils/format";

export default function ShareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type: string; duration: string; distance: string;
    steps: string; calories: string;
  }>();

  const workoutType = (params.type as WorkoutType) || "run";
  const cfg = WORKOUT_CONFIGS[workoutType];
  const duration = parseInt(params.duration || "0");
  const distance = parseFloat(params.distance || "0");
  const steps = parseInt(params.steps || "0");
  const calories = parseFloat(params.calories || "0");
  const pace = duration > 0 && distance > 0 ? duration / distance : 0;
  const speed = duration > 0 ? (distance / duration) * 3600 : 0;

  const [bgImageUri, setBgImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  async function pickBackground() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to set a background image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!result.canceled) {
      setBgImageUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async function captureCard(): Promise<string | null> {
    if (Platform.OS === "web") return null;
    try {
      const uri = await (viewShotRef.current as any)?.capture?.();
      return uri ?? null;
    } catch {
      return null;
    }
  }

  async function handleShare() {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureCard();
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Workout" });
      } else {
        // Fallback: share text
        await Share.share({
          message: `🏃 Just finished a ${cfg.label}!\n\n📏 Distance: ${formatDistance(distance)} km\n⏱ Duration: ${formatDuration(duration)}\n🔥 Calories: ${Math.round(calories)} kcal\n⚡ Pace: ${formatPace(pace)} /km\n\nTracked with Dokra Fitness`,
          title: "My Workout",
        });
      }
    } catch (e) {
      Alert.alert("Error", "Could not share the workout card.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (Platform.OS === "web") {
      Alert.alert("Save", "Open the app on your phone to save to gallery.");
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to save the image to your gallery.");
        setSaving(false);
        return;
      }
      const uri = await captureCard();
      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Saved!", "Workout card saved to your gallery.");
      }
    } catch {
      Alert.alert("Error", "Could not save the image.");
    } finally {
      setSaving(false);
    }
  }

  const CardContent = () => (
    <View style={styles.cardInner}>
      {/* Brand header */}
      <View style={styles.brandRow}>
        <MaterialCommunityIcons name="lightning-bolt" size={18} color="#fff" />
        <Text style={styles.brandName}>DOKRA FITNESS</Text>
      </View>

      {/* Activity + date */}
      <View style={styles.activityRow}>
        <View style={[styles.activityBadge, { backgroundColor: cfg.color + "44" }]}>
          <MaterialCommunityIcons name={cfg.icon as any} size={16} color="#fff" />
          <Text style={styles.activityLabel}>{cfg.label.toUpperCase()}</Text>
        </View>
        <Text style={styles.cardDate}>{date}</Text>
      </View>

      {/* Big distance */}
      <View style={styles.bigMetricSection}>
        <Text style={styles.bigMetricValue}>{formatDistance(distance)}</Text>
        <Text style={styles.bigMetricUnit}>kilometers</Text>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: "rgba(255,255,255,0.2)" }]}>
        <CardStat label="DURATION" value={formatDuration(duration)} />
        <View style={styles.statDiv} />
        <CardStat label="CALORIES" value={`${Math.round(calories)}`} unit="kcal" />
        <View style={styles.statDiv} />
        <CardStat label="PACE" value={formatPace(pace)} unit="/km" />
        {steps > 0 && (
          <>
            <View style={styles.statDiv} />
            <CardStat label="STEPS" value={steps.toLocaleString()} />
          </>
        )}
      </View>

      {/* Footer */}
      <Text style={styles.cardFooter}>dokra-fitness.app</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: topPad + 12 }]}
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Shareable Card */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1 }}
        style={styles.cardWrapper}
      >
        {bgImageUri ? (
          <ImageBackground source={{ uri: bgImageUri }} style={styles.cardBg}>
            <LinearGradient
              colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.75)", "rgba(0,0,0,0.9)"]}
              style={StyleSheet.absoluteFill}
            />
            <CardContent />
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={[cfg.color + "DD", "#0F172A", "#0F172A"]}
            style={styles.cardBg}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <CardContent />
          </LinearGradient>
        )}
      </ViewShot>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: bottomPad + 16 }]}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={pickBackground}
          disabled={saving}
        >
          <MaterialCommunityIcons name="image-plus" size={22} color="#fff" />
          <Text style={styles.controlLabel}>Background</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, styles.controlBtnPrimary, { opacity: saving ? 0.6 : 1 }]}
          onPress={handleShare}
          disabled={saving}
        >
          <MaterialCommunityIcons name="share-variant" size={22} color="#fff" />
          <Text style={styles.controlLabel}>{saving ? "Sharing..." : "Share"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleSave}
          disabled={saving}
        >
          <MaterialCommunityIcons name="download" size={22} color="#fff" />
          <Text style={styles.controlLabel}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CardStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute", left: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  cardWrapper: { flex: 1 },
  cardBg: { flex: 1, justifyContent: "flex-end" },
  cardInner: { padding: 28, gap: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 3 },
  activityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  activityLabel: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  cardDate: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  bigMetricSection: { gap: 4 },
  bigMetricValue: { color: "#fff", fontSize: 80, fontWeight: "900", lineHeight: 84, letterSpacing: -3 },
  bigMetricUnit: { color: "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: "500" },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: 1, paddingTop: 20,
  },
  statDiv: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  statLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  statValue: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statUnit: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
  cardFooter: { color: "rgba(255,255,255,0.3)", fontSize: 10, textAlign: "center", letterSpacing: 1 },
  controls: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12,
  },
  controlBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)", gap: 4,
  },
  controlBtnPrimary: { backgroundColor: "#6366F1" },
  controlLabel: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
