import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/context/ProfileContext";
import { ActivityGrid } from "@/components/ActivityGrid";
import { WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [selected, setSelected] = useState<WorkoutType>("run");

  const cfg = WORKOUT_CONFIGS[selected];
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleStart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({ pathname: "/tracking", params: { type: selected } });
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Start Activity</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Choose your workout type
      </Text>

      <ActivityGrid selected={selected} onSelect={setSelected} />

      {/* Selected Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient
          colors={[cfg.color + "22", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: cfg.color + "22" }]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={28} color={cfg.color} />
          </View>
          <View>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>{cfg.label}</Text>
            <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>
              ~{cfg.speed} km/h · {cfg.met} MET
            </Text>
          </View>
        </View>
        <View style={styles.infoStats}>
          <InfoItem
            label="Est. burn"
            value={`${Math.round(cfg.met * profile.weightKg * 0.5)} kcal/hr`}
            color={colors.calories}
          />
          <InfoItem
            label="Weight used"
            value={`${profile.weightKg} kg`}
            color={colors.mutedForeground}
          />
        </View>
      </View>

      {/* Tips */}
      <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="lightbulb-outline" size={18} color={colors.time} />
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
          {getTip(selected)}
        </Text>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[styles.startBtn, { shadowColor: cfg.color }]}
        onPress={handleStart}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[cfg.color, cfg.color + "BB"]}
          style={styles.startGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="play" size={32} color="#080810" />
          <Text style={styles.startText}>Start {cfg.label}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: Platform.OS === "web" ? 100 : 90 }} />
    </ScrollView>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 12, color: "#8A8A9A" }}>{label}</Text>
    </View>
  );
}

function getTip(type: WorkoutType): string {
  const tips: Record<WorkoutType, string> = {
    walk: "Maintain a brisk pace with arms swinging naturally for maximum calorie burn.",
    run: "Start slow, find your rhythm. Proper breathing: 2 steps inhale, 2 exhale.",
    cycle: "Keep your cadence between 70-90 RPM for an efficient, sustainable ride.",
    hike: "Use trekking poles on descents to protect your knees on steep terrain.",
    trek: "Pack light, stay hydrated, and use layering system for temperature changes.",
    skate: "Bend your knees, push from the hip, and keep your weight forward.",
  };
  return tips[type];
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20, gap: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  sub: { fontSize: 15, marginTop: -8 },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    overflow: "hidden",
    gap: 16,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: { fontSize: 18, fontWeight: "700" },
  infoSub: { fontSize: 13, marginTop: 2 },
  infoStats: { flexDirection: "row", gap: 24 },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  startBtn: {
    borderRadius: 20,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  startGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  startText: { fontSize: 20, fontWeight: "800", color: "#080810" },
});
