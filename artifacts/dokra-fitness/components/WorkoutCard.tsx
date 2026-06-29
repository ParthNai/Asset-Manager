import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Workout, WORKOUT_CONFIGS } from "@/constants/workout";
import { formatDuration, formatDistance } from "@/utils/format";

interface Props {
  workout: Workout;
  onPress?: () => void;
}

export function WorkoutCard({ workout, onPress }: Props) {
  const colors = useColors();
  const config = WORKOUT_CONFIGS[workout.type];
  const date = new Date(workout.startTime);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.color + "22" }]}>
        <MaterialCommunityIcons name={config.icon as any} size={26} color={config.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.type, { color: colors.foreground }]}>{config.label}</Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {dateStr} · {timeStr}
        </Text>
        <View style={styles.metrics}>
          <Metric value={formatDistance(workout.distance)} unit="km" color={colors.distance} />
          <Metric value={formatDuration(workout.duration)} unit="" color={colors.mutedForeground} />
          <Metric value={Math.round(workout.calories).toString()} unit="kcal" color={colors.calories} />
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function Metric({ value, unit, color }: { value: string; unit: string; color: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  type: {
    fontSize: 16,
    fontWeight: "600",
  },
  date: {
    fontSize: 12,
  },
  metrics: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  metric: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: "#8A8A9A",
  },
});
