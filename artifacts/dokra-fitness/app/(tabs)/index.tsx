import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
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
import { useColors } from "@/hooks/useColors";
import { useWorkouts } from "@/context/WorkoutContext";
import { useProfile } from "@/context/ProfileContext";
import { CircularProgress } from "@/components/CircularProgress";
import { StatCard } from "@/components/StatCard";
import { WorkoutCard } from "@/components/WorkoutCard";
import { WeeklyBar } from "@/components/WeeklyBar";
import { getGreeting, formatDistance } from "@/utils/format";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workouts, getTodayStats, getWeeklyData } = useWorkouts();
  const { profile } = useProfile();

  const today = getTodayStats();
  const weeklyData = getWeeklyData();
  const recent = workouts.slice(0, 3);

  const stepProgress = Math.min(today.steps / profile.dailyStepGoal, 1);
  const calProgress = Math.min(today.calories / profile.dailyCalorieGoal, 1);
  const distProgress = Math.min(today.distance / profile.dailyDistanceGoal, 1);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {getGreeting()},
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {profile.name} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: colors.primary + "22" }]}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <MaterialCommunityIcons name="account" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Daily Progress Ring */}
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient
          colors={["#00D4FF11", "#C56AFF11"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.ringRow}>
          <CircularProgress size={130} strokeWidth={10} progress={stepProgress} color={colors.steps}>
            <View style={styles.ringInner}>
              <Text style={[styles.ringValue, { color: colors.foreground }]}>
                {today.steps.toLocaleString()}
              </Text>
              <Text style={[styles.ringLabel, { color: colors.mutedForeground }]}>steps</Text>
            </View>
          </CircularProgress>

          <View style={styles.subRings}>
            <View style={styles.subRingRow}>
              <CircularProgress size={58} strokeWidth={6} progress={calProgress} color={colors.calories}>
                <MaterialCommunityIcons name="fire" size={16} color={colors.calories} />
              </CircularProgress>
              <View>
                <Text style={[styles.subVal, { color: colors.foreground }]}>
                  {Math.round(today.calories)}
                </Text>
                <Text style={[styles.subLbl, { color: colors.mutedForeground }]}>kcal</Text>
              </View>
            </View>
            <View style={styles.subRingRow}>
              <CircularProgress size={58} strokeWidth={6} progress={distProgress} color={colors.distance}>
                <MaterialCommunityIcons name="map-marker-distance" size={14} color={colors.distance} />
              </CircularProgress>
              <View>
                <Text style={[styles.subVal, { color: colors.foreground }]}>
                  {formatDistance(today.distance)}
                </Text>
                <Text style={[styles.subLbl, { color: colors.mutedForeground }]}>km</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.goalRow}>
          <Text style={[styles.goalText, { color: colors.mutedForeground }]}>
            Daily goal: {profile.dailyStepGoal.toLocaleString()} steps
          </Text>
          <Text style={[styles.goalPct, { color: colors.primary }]}>
            {Math.round(stepProgress * 100)}%
          </Text>
        </View>
      </View>

      {/* Quick Start */}
      <TouchableOpacity
        style={styles.quickStart}
        onPress={() => router.push("/(tabs)/track")}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#00D4FF", "#6C63FF"]}
          style={styles.quickStartGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
          <Text style={styles.quickStartText}>Start Workout</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Today Stats Grid */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            label="Steps"
            value={today.steps.toLocaleString()}
            unit=""
            icon="walk"
            color={colors.steps}
          />
          <StatCard
            label="Distance"
            value={formatDistance(today.distance)}
            unit="km"
            icon="map-marker-distance"
            color={colors.distance}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Calories"
            value={Math.round(today.calories).toString()}
            unit="kcal"
            icon="fire"
            color={colors.calories}
          />
          <StatCard
            label="Active Time"
            value={Math.floor(today.duration / 60).toString()}
            unit="min"
            icon="timer-outline"
            color={colors.time}
          />
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>This Week</Text>
        <Text style={[styles.chartSub, { color: colors.mutedForeground }]}>Distance (km)</Text>
        <WeeklyBar data={weeklyData} />
      </View>

      {/* Recent Workouts */}
      {recent.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {recent.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </>
      )}

      {recent.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="run-fast" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No workouts yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Start your first activity and track your progress
          </Text>
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 100 : 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 24, fontWeight: "700" },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  ringInner: { alignItems: "center" },
  ringValue: { fontSize: 20, fontWeight: "700" },
  ringLabel: { fontSize: 11 },
  subRings: { gap: 16, flex: 1 },
  subRingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  subVal: { fontSize: 18, fontWeight: "700" },
  subLbl: { fontSize: 11 },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E1E30",
  },
  goalText: { fontSize: 13 },
  goalPct: { fontSize: 13, fontWeight: "700" },
  quickStart: { borderRadius: 16, overflow: "hidden", marginBottom: 20 },
  quickStartGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    paddingHorizontal: 20,
  },
  quickStartText: { fontSize: 17, fontWeight: "700", color: "#fff", flex: 1, marginLeft: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: { fontSize: 14, fontWeight: "500" },
  statsGrid: { gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
  chartCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 4,
  },
  chartTitle: { fontSize: 16, fontWeight: "700" },
  chartSub: { fontSize: 12, marginBottom: 12 },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
