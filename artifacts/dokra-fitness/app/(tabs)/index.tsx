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
import { WorkoutCard } from "@/components/WorkoutCard";
import { WeeklyBar } from "@/components/WeeklyBar";
import { getGreeting, formatDistance } from "@/utils/format";
import { WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";

const QUICK_TYPES: WorkoutType[] = ["walk", "run", "cycle", "hike"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workouts, getTodayStats, getWeeklyData } = useWorkouts();
  const { profile } = useProfile();

  const today = getTodayStats();
  const weeklyData = getWeeklyData();
  const recent = workouts.slice(0, 3);

  const stepPct = Math.min(today.steps / profile.dailyStepGoal, 1);
  const calPct = Math.min(today.calories / profile.dailyCalorieGoal, 1);
  const distPct = Math.min(today.distance / profile.dailyDistanceGoal, 1);

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HERO GRADIENT ── */}
      <LinearGradient
        colors={["#6366F1", "#0EA5E9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.heroName}>{profile.name} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Text style={styles.avatarLetter}>
              {profile.name.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.heroDate}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          })}
        </Text>
      </LinearGradient>

      {/* ── FLOATING RINGS CARD ── */}
      <View style={[styles.floatCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's Activity</Text>
        <View style={styles.ringsRow}>
          <RingItem
            size={100}
            sw={9}
            progress={stepPct}
            color={colors.steps}
            icon="shoe-print"
            value={today.steps.toLocaleString()}
            label="Steps"
          />
          <RingItem
            size={100}
            sw={9}
            progress={calPct}
            color={colors.calories}
            icon="fire"
            value={Math.round(today.calories).toString()}
            label="Calories"
          />
          <RingItem
            size={100}
            sw={9}
            progress={distPct}
            color={colors.distance}
            icon="map-marker-distance"
            value={formatDistance(today.distance)}
            label="km"
          />
        </View>
        <View style={[styles.goalBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.goalFill, { width: `${Math.round(stepPct * 100)}%` as any, backgroundColor: colors.steps }]} />
        </View>
        <Text style={[styles.goalText, { color: colors.mutedForeground }]}>
          {Math.round(stepPct * 100)}% of daily goal · {profile.dailyStepGoal.toLocaleString()} steps
        </Text>
      </View>

      {/* ── QUICK START ── */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push("/(tabs)/track")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#6366F1", "#0EA5E9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startGradient}
          >
            <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
            <Text style={styles.startText}>Start Workout</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Activity type quick-launch row */}
        <View style={styles.quickRow}>
          {QUICK_TYPES.map((t) => {
            const cfg = WORKOUT_CONFIGS[t];
            return (
              <TouchableOpacity
                key={t}
                style={[styles.quickBtn, { backgroundColor: cfg.color + "18", borderColor: cfg.color + "40" }]}
                onPress={() =>
                  router.push({ pathname: "/tracking", params: { type: t } })
                }
              >
                <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
                <Text style={[styles.quickLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── TODAY STATS ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today</Text>
        <View style={styles.statsGrid}>
          <MiniStat label="Active Time" value={`${Math.floor(today.duration / 60)}`} unit="min" color={colors.time} icon="timer-outline" colors={colors} />
          <MiniStat label="Distance" value={formatDistance(today.distance)} unit="km" color={colors.distance} icon="map-marker-distance" colors={colors} />
          <MiniStat label="Calories" value={Math.round(today.calories).toString()} unit="kcal" color={colors.calories} icon="fire" colors={colors} />
          <MiniStat label="Workouts" value={workouts.filter(w => new Date(w.startTime).toDateString() === new Date().toDateString()).length.toString()} unit="" color={colors.steps} icon="dumbbell" colors={colors} />
        </View>
      </View>

      {/* ── WEEKLY CHART ── */}
      <View style={styles.section}>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>This Week</Text>
            <Text style={[styles.chartUnit, { color: colors.mutedForeground }]}>km / day</Text>
          </View>
          <WeeklyBar data={weeklyData} />
        </View>
      </View>

      {/* ── RECENT WORKOUTS ── */}
      <View style={styles.section}>
        {recent.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
              </TouchableOpacity>
            </View>
            {recent.map((w) => <WorkoutCard key={w.id} workout={w} />)}
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="run-fast" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No workouts yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Start your first activity and track your progress
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function RingItem({ size, sw, progress, color, icon, value, label }: {
  size: number; sw: number; progress: number; color: string;
  icon: string; value: string; label: string;
}) {
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <CircularProgress size={size} strokeWidth={sw} progress={progress} color={color} bgColor={color + "22"}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </CircularProgress>
      <Text style={{ fontSize: 16, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#64748B" }}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value, unit, color, icon, colors }: {
  label: string; value: string; unit: string; color: string; icon: string; colors: any;
}) {
  return (
    <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.miniIcon, { backgroundColor: color + "18" }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.miniValue, { color: colors.foreground }]}>
        {value}<Text style={{ fontSize: 12, color: colors.mutedForeground }}>{unit ? ` ${unit}` : ""}</Text>
      </Text>
      <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 70,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  greeting: { color: "rgba(255,255,255,0.75)", fontSize: 14 },
  heroName: { color: "#fff", fontSize: 24, fontWeight: "800" },
  heroDate: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontSize: 20, fontWeight: "800" },
  floatCard: {
    marginHorizontal: 16,
    marginTop: -50,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  ringsRow: { flexDirection: "row", justifyContent: "space-around" },
  goalBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  goalFill: { height: 4, borderRadius: 2 },
  goalText: { fontSize: 12, textAlign: "center" },
  section: { paddingHorizontal: 16, marginTop: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  startBtn: { borderRadius: 18, overflow: "hidden" },
  startGradient: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 18, paddingHorizontal: 22,
  },
  startText: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1, marginLeft: 10 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, gap: 4,
  },
  quickLabel: { fontSize: 10, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  miniStat: {
    width: "47%", flexGrow: 1, borderRadius: 16, padding: 14,
    borderWidth: 1, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  miniIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  miniValue: { fontSize: 22, fontWeight: "700" },
  miniLabel: { fontSize: 11, fontWeight: "500" },
  chartCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 4 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  chartUnit: { fontSize: 12 },
  emptyCard: { borderRadius: 20, padding: 32, borderWidth: 1, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
