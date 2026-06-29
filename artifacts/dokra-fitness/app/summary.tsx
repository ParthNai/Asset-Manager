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

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)");
  }

  function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/share",
      params: {
        type: workoutType,
        duration: duration.toString(),
        distance: distance.toString(),
        steps: steps.toString(),
        calories: calories.toString(),
      },
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient header */}
      <LinearGradient
        colors={[cfg.color + "40", colors.background]}
        style={[styles.heroBg, { paddingTop: topPad + 24 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 24, paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "44" }]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={40} color={cfg.color} />
          </View>
          <Text style={[styles.completedText, { color: cfg.color }]}>Workout Complete!</Text>
          <Text style={[styles.typeText, { color: colors.foreground }]}>{cfg.label}</Text>
        </View>

        {/* Main stats card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BigMetric label="Distance" value={formatDistance(distance)} unit="km" color={colors.distance} />
          <View style={[styles.div, { backgroundColor: colors.border }]} />
          <View style={styles.pair}>
            <SmallMetric label="Duration" value={formatDuration(duration)} color={colors.foreground} />
            <SmallMetric label="Calories" value={`${Math.round(calories)} kcal`} color={colors.calories} />
          </View>
          <View style={[styles.div, { backgroundColor: colors.border }]} />
          <View style={styles.pair}>
            <SmallMetric label="Avg Pace" value={formatPace(pace)} color={colors.time} />
            <SmallMetric label="Avg Speed" value={`${speed.toFixed(1)} km/h`} color={colors.primary} />
          </View>
          {steps > 0 && (
            <>
              <View style={[styles.div, { backgroundColor: colors.border }]} />
              <SmallMetric label="Steps" value={steps.toLocaleString()} color={colors.steps} />
            </>
          )}
        </View>

        {/* Motivation */}
        <View style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.primary} />
          <Text style={[styles.quoteText, { color: colors.mutedForeground }]}>
            {getMotivation(distance)}
          </Text>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <LinearGradient
            colors={["#6366F1", "#0EA5E9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            <MaterialCommunityIcons name="share-variant" size={22} color="#fff" />
            <Text style={styles.btnText}>Create Share Card</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleDone}
        >
          <Text style={[styles.doneBtnText, { color: colors.foreground }]}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function BigMetric({ label, value, unit, color }: any) {
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={[styles.bigValue, { color }]}>
        {value}<Text style={{ fontSize: 18, fontWeight: "400", color: "#64748B" }}> {unit}</Text>
      </Text>
      <Text style={{ fontSize: 13, color: "#64748B" }}>{label}</Text>
    </View>
  );
}

function SmallMetric({ label, value, color }: any) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.smallValue, { color }]}>{value}</Text>
      <Text style={{ fontSize: 12, color: "#64748B" }}>{label}</Text>
    </View>
  );
}

function getMotivation(dist: number): string {
  if (dist === 0) return "Every journey starts with a single step. Keep moving!";
  if (dist < 1) return "Great start! Every meter counts toward your goals.";
  if (dist < 3) return "Solid effort! You're building a fantastic habit.";
  if (dist < 5) return "Amazing work! You're well on your way to peak fitness.";
  if (dist < 10) return "Outstanding performance! You're pushing real limits today.";
  return "Incredible! You just put in elite-level work. Respect.";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBg: { ...StyleSheet.absoluteFillObject, height: 280 },
  content: { paddingHorizontal: 20, gap: 16 },
  hero: { alignItems: "center", gap: 10 },
  badge: { width: 90, height: 90, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  completedText: { fontSize: 15, fontWeight: "700" },
  typeText: { fontSize: 28, fontWeight: "800" },
  statsCard: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 14 },
  div: { height: 1 },
  pair: { flexDirection: "row", gap: 24 },
  bigValue: { fontSize: 40, fontWeight: "800" },
  smallValue: { fontSize: 20, fontWeight: "700" },
  quoteCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1 },
  quoteText: { flex: 1, fontSize: 14, lineHeight: 20 },
  shareBtn: { borderRadius: 16, overflow: "hidden" },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 10 },
  btnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  doneBtn: { borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1 },
  doneBtnText: { fontSize: 17, fontWeight: "600" },
});
