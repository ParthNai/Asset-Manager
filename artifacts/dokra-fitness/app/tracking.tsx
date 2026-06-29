import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useWorkouts } from "@/context/WorkoutContext";
import { useProfile } from "@/context/ProfileContext";
import { WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";
import { formatDuration, formatDistance, formatPace } from "@/utils/format";

export default function TrackingScreen() {
  const { type } = useLocalSearchParams<{ type: WorkoutType }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addWorkout } = useWorkouts();
  const { profile } = useProfile();

  const workoutType: WorkoutType = (type as WorkoutType) || "run";
  const cfg = WORKOUT_CONFIGS[workoutType];

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const distance = (cfg.speed * elapsed) / 3600;
  const steps = Math.round(distance * cfg.stepsPerKm);
  const calories = cfg.met * profile.weightKg * (elapsed / 3600);
  const pace = elapsed > 0 && distance > 0 ? elapsed / distance : 0;
  const speed = cfg.speed;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    startTimer();
    startTimeRef.current = Date.now();
    setStarted(true);
    return () => stopTimer();
  }, []);

  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handlePause() {
    if (paused) {
      startTimer();
      setPaused(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      stopTimer();
      setPaused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  async function handleStop() {
    stopTimer();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const workout = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: workoutType,
      startTime: startTimeRef.current,
      duration: elapsed,
      distance,
      steps,
      calories,
      avgPace: pace,
      avgSpeed: speed,
    };

    await addWorkout(workout);
    router.replace({ pathname: "/summary", params: { workoutId: workout.id, type: workoutType, duration: elapsed.toString(), distance: distance.toString(), steps: steps.toString(), calories: calories.toString() } });
  }

  function confirmStop() {
    if (elapsed < 10) {
      handleStop();
      return;
    }
    if (Platform.OS === "web") {
      handleStop();
    } else {
      Alert.alert("Stop Workout?", "Your progress will be saved.", [
        { text: "Cancel", style: "cancel" },
        { text: "Stop & Save", style: "destructive", onPress: handleStop },
      ]);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[cfg.color + "22", colors.background, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.card }]}
          onPress={confirmStop}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.typeBadge, { backgroundColor: cfg.color + "22", borderColor: cfg.color + "44" }]}>
          <MaterialCommunityIcons name={cfg.icon as any} size={16} color={cfg.color} />
          <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.pauseIndicator}>
          {paused && (
            <View style={[styles.pausedBadge, { backgroundColor: colors.time + "22" }]}>
              <Text style={[styles.pausedText, { color: colors.time }]}>PAUSED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Timer */}
      <View style={styles.timerSection}>
        <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>Duration</Text>
        <Text style={[styles.timer, { color: colors.foreground }]}>
          {formatDuration(elapsed)}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TrackingMetric
          label="Distance"
          value={formatDistance(distance)}
          unit="km"
          color={colors.distance}
          icon="map-marker-distance"
          colors={colors}
        />
        <TrackingMetric
          label="Calories"
          value={Math.round(calories).toString()}
          unit="kcal"
          color={colors.calories}
          icon="fire"
          colors={colors}
        />
        <TrackingMetric
          label="Speed"
          value={speed.toFixed(1)}
          unit="km/h"
          color={colors.primary}
          icon="speedometer"
          colors={colors}
        />
        <TrackingMetric
          label="Pace"
          value={formatPace(pace)}
          unit="min/km"
          color={colors.time}
          icon="timer-outline"
          colors={colors}
        />
        {cfg.stepsPerKm > 0 && (
          <TrackingMetric
            label="Steps"
            value={steps.toLocaleString()}
            unit=""
            color={colors.steps}
            icon="walk"
            colors={colors}
          />
        )}
      </View>

      {/* Live indicator */}
      <View style={styles.liveRow}>
        <View style={[styles.liveDot, { backgroundColor: paused ? colors.mutedForeground : "#FF4444" }]} />
        <Text style={[styles.liveText, { color: colors.mutedForeground }]}>
          {paused ? "Paused" : "Recording"}
        </Text>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: bottomPad + 24 }]}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handlePause}
        >
          <MaterialCommunityIcons
            name={paused ? "play" : "pause"}
            size={28}
            color={colors.foreground}
          />
          <Text style={[styles.controlLabel, { color: colors.foreground }]}>
            {paused ? "Resume" : "Pause"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stopBtn, { backgroundColor: "#FF4444" }]}
          onPress={confirmStop}
        >
          <MaterialCommunityIcons name="stop" size={36} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TrackingMetric({
  label,
  value,
  unit,
  color,
  icon,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: string;
  colors: any;
}) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      {!!unit && <Text style={[styles.metricUnit, { color: colors.mutedForeground }]}>{unit}</Text>}
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 12,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeLabel: { fontSize: 13, fontWeight: "600" },
  pauseIndicator: { flex: 1, alignItems: "flex-end" },
  pausedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pausedText: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  timerSection: { alignItems: "center", paddingTop: 24, paddingBottom: 32, gap: 6 },
  timerLabel: { fontSize: 14, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" },
  timer: { fontSize: 72, fontWeight: "800", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  metric: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 2,
    alignItems: "flex-start",
  },
  metricValue: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  metricUnit: { fontSize: 12 },
  metricLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 13 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginTop: "auto",
    paddingHorizontal: 24,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  controlLabel: { fontSize: 15, fontWeight: "600" },
  stopBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
