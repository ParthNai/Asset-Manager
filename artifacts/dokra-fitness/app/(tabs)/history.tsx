import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useWorkouts } from "@/context/WorkoutContext";
import { WorkoutCard } from "@/components/WorkoutCard";
import { Workout, WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";
import { formatDistance, formatDuration } from "@/utils/format";

type FilterType = "all" | WorkoutType;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "run", label: "Run" },
  { key: "walk", label: "Walk" },
  { key: "cycle", label: "Cycle" },
  { key: "hike", label: "Hike" },
];

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workouts } = useWorkouts();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? workouts : workouts.filter((w) => w.type === filter);

  const totalDist = workouts.reduce((s, w) => s + w.distance, 0);
  const totalCal = workouts.reduce((s, w) => s + w.calories, 0);
  const totalDur = workouts.reduce((s, w) => s + w.duration, 0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>

        {/* All-time stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SummaryItem label="Workouts" value={workouts.length.toString()} color={colors.primary} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryItem label="Distance" value={`${formatDistance(totalDist)} km`} color={colors.distance} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryItem label="Calories" value={`${Math.round(totalCal)}`} color={colors.calories} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryItem label="Time" value={formatDuration(totalDur)} color={colors.time} />
        </View>

        {/* Filter chips */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.card,
                  borderColor: filter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f.key ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 100 : 90 },
        ]}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No workouts yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Complete an activity to see it here
            </Text>
          </View>
        }
      />
    </View>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={{ fontSize: 10, color: "#8A8A9A" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, gap: 14, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryValue: { fontSize: 14, fontWeight: "700" },
  divider: { width: 1, height: 28, marginHorizontal: 4 },
  filters: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center" },
});
