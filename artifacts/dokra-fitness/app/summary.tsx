import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";
import { formatDistance, formatDuration, formatPace } from "@/utils/format";

export default function SummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type: string;
    duration: string;
    distance: string;
    steps: string;
    calories: string;
  }>();

  const workoutType = (params.type as WorkoutType) || "run";
  const cfg = WORKOUT_CONFIGS[workoutType];
  const duration = parseInt(params.duration || "0");
  const distance = parseFloat(params.distance || "0");
  const steps = parseInt(params.steps || "0");
  const calories = parseFloat(params.calories || "0");
  const pace = duration > 0 && distance > 0 ? duration / distance : 0;
  const speed = duration > 0 ? (distance / duration) * 3600 : 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)");
  }

  const isPR = distance > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[cfg.color + "33", colors.background]}
        style={[StyleSheet.absoluteFill, { height: 300 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 24, paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy */}
        <View style={styles.heroSection}>
          <View style={[styles.activityBadge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "44" }]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={40} color={cfg.color} />
          </View>
          <Text style={[styles.completedLabel, { color: cfg.color }]}>Workout Complete!</Text>
          <Text style={[styles.activityTitle, { color: colors.foreground }]}>{cfg.label}</Text>
          {isPR && (
            <View style={[styles.prBadge, { backgroundColor: colors.time + "22" }]}>
              <MaterialCommunityIcons name="trophy" size={14} color={colors.time} />
              <Text style={[styles.prText, { color: colors.time }]}>New Activity Saved</Text>
            </View>
          )}
        </View>

        {/* Main metrics */}
        <View style={[styles.mainMetrics, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MetricRow label="Distance" value={formatDistance(distance)} unit="km" color={colors.distance} big />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metricPair}>
            <MetricRow label="Duration" value={formatDuration(duration)} unit="" color={colors.foreground} />
            <MetricRow label="Calories" value={Math.round(calories).toString()} unit="kcal" color={colors.calories} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metricPair}>
            <MetricRow label="Avg Pace" value={formatPace(pace)} unit="min/km" color={colors.time} />
            <MetricRow label="Avg Speed" value={speed.toFixed(1)} unit="km/h" color={colors.primary} />
          </View>
          {steps > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <MetricRow label="Steps" value={steps.toLocaleString()} unit="" color={colors.steps} />
            </>
          )}
        </View>

        {/* Motivational message */}
        <View style={[styles.quoteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.primary} />
          <Text style={[styles.quoteText, { color: colors.mutedForeground }]}>
            {getMotivation(distance, duration)}
          </Text>
        </View>

        {/* Done button */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <LinearGradient
            colors={[cfg.color, cfg.color + "BB"]}
            style={styles.doneBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MetricRow({
  label,
  value,
  unit,
  color,
  big,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  big?: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: "#8A8A9A" }]}>{label}</Text>
      <Text style={[big ? styles.bigValue : styles.metricValue, { color }]}>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function getMotivation(dist: number, dur: number): string {
  if (dist === 0) return "Every journey starts with a single step. Keep moving!";
  if (dist < 1) return "Great start! Every meter counts toward your goals.";
  if (dist < 3) return "Solid effort! You're building a fantastic habit.";
  if (dist < 5) return "Amazing work! You're well on your way to peak fitness.";
  if (dist < 10) return "Outstanding performance! You're pushing real limits today.";
  return "Incredible! You just put in elite-level work. Respect.";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  heroSection: { alignItems: "center", gap: 10 },
  activityBadge: { width: 90, height: 90, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  completedLabel: { fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  activityTitle: { fontSize: 28, fontWeight: "800" },
  prBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  prText: { fontSize: 13, fontWeight: "600" },
  mainMetrics: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 16 },
  metricPair: { flexDirection: "row", gap: 20 },
  divider: { height: 1 },
  metricRow: { gap: 2 },
  metricLabel: { fontSize: 12, fontWeight: "500" },
  metricValue: { fontSize: 22, fontWeight: "700" },
  bigValue: { fontSize: 36, fontWeight: "800" },
  metricUnit: { fontSize: 14, fontWeight: "400" },
  quoteCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1 },
  quoteText: { flex: 1, fontSize: 14, lineHeight: 20 },
  doneBtn: { borderRadius: 16, overflow: "hidden" },
  doneBtnGradient: { padding: 18, alignItems: "center" },
  doneBtnText: { fontSize: 18, fontWeight: "700", color: "#080810" },
});
