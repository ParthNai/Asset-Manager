import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Pedometer } from "expo-sensors";
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

function calcDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TrackingScreen() {
  const { type } = useLocalSearchParams<{ type: WorkoutType }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addWorkout } = useWorkouts();
  const { profile } = useProfile();

  const workoutType: WorkoutType = (type as WorkoutType) || "run";
  const cfg = WORKOUT_CONFIGS[workoutType];

  const [elapsed, setElapsed] = useState(0);
  const [movingElapsed, setMovingElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [permStatus, setPermStatus] = useState<"pending" | "granted" | "denied">("pending");

  // Real GPS
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const currentSpeedRef = useRef(0);
  const lastCoordRef = useRef<{ lat: number; lon: number } | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // Real step counter
  const [steps, setSteps] = useState(0);
  const pedometerSubRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const pedometerAvailable = useRef(false);

  // Timer
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedElapsedRef = useRef(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Calories only count while actually moving (movingElapsed tracks real movement time)
  const calories = cfg.met * profile.weightKg * (movingElapsed / 3600);
  const pace = movingElapsed > 0 && distanceKm > 0.01 ? movingElapsed / distanceKm : 0;
  // Speed shows 0 until GPS confirms real movement — no fake fallback
  const displaySpeed = currentSpeed * 3.6;

  // Request permissions on mount, then start tracking
  useEffect(() => {
    requestAndStart();
    return () => cleanup();
  }, []);

  async function requestAndStart() {
    // --- Location permission ---
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      setPermStatus("denied");
      Alert.alert(
        "Location Required",
        "Dokra needs location access to track your workout route and calculate real distance. Please enable it in Settings.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }

    // Request background location (best-effort, not mandatory)
    await Location.requestBackgroundPermissionsAsync().catch(() => {});

    setPermStatus("granted");

    // --- Pedometer ---
    const pedometerOK = await Pedometer.isAvailableAsync().catch(() => false);
    pedometerAvailable.current = pedometerOK;
    if (pedometerOK) {
      pedometerSubRef.current = Pedometer.watchStepCount((result) => {
        setSteps(result.steps);
      });
    }

    // --- Start GPS ---
    startTimeRef.current = Date.now();
    startGPS();
    startTimer();
  }

  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
      // Only count calories/pace time when GPS confirmed real movement (> 1 m/s)
      if (currentSpeedRef.current > 1.0) {
        setMovingElapsed((e) => e + 1);
      }
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startGPS() {
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      (loc) => {
        const { latitude, longitude, speed } = loc.coords;
        if (lastCoordRef.current) {
          const meters = calcDistanceMeters(
            lastCoordRef.current.lat,
            lastCoordRef.current.lon,
            latitude,
            longitude
          );
          // Real movement: > 2m and < 50m per update (filters GPS drift/noise)
          if (meters > 2 && meters < 50) {
            setDistanceKm((prev) => prev + meters / 1000);
            // Only update speed when we confirmed real physical movement
            if (speed !== null && speed > 0) {
              currentSpeedRef.current = speed;
              setCurrentSpeed(speed);
            }
          } else if (meters <= 2) {
            // Standing still — zero out the displayed speed
            currentSpeedRef.current = 0;
            setCurrentSpeed(0);
          }
        }
        lastCoordRef.current = { lat: latitude, lon: longitude };
      }
    ).then((sub) => {
      locationSubRef.current = sub;
    });
  }

  function stopGPS() {
    try {
      locationSubRef.current?.remove();
    } catch (_) {
      // expo-location subscription removal can throw on web
    }
    locationSubRef.current = null;
    // Reset speed to 0 when GPS stops
    currentSpeedRef.current = 0;
    setCurrentSpeed(0);
  }

  function cleanup() {
    stopTimer();
    stopGPS();
    pedometerSubRef.current?.remove();
    pedometerSubRef.current = null;
  }

  function handlePause() {
    if (paused) {
      startTimer();
      startGPS();
      setPaused(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      stopTimer();
      stopGPS();
      lastCoordRef.current = null;
      setPaused(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  async function handleStop() {
    cleanup();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const finalSteps =
      pedometerAvailable.current
        ? steps
        : Math.round(distanceKm * cfg.stepsPerKm);

    const workout = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: workoutType,
      startTime: startTimeRef.current,
      duration: elapsed,
      distance: distanceKm,
      steps: finalSteps,
      calories,
      avgPace: pace,
      avgSpeed: displaySpeed,
    };

    await addWorkout(workout);
    router.replace({
      pathname: "/summary",
      params: {
        workoutId: workout.id,
        type: workoutType,
        duration: elapsed.toString(),
        distance: distanceKm.toString(),
        steps: finalSteps.toString(),
        calories: calories.toString(),
      },
    });
  }

  function confirmStop() {
    if (elapsed < 10) {
      handleStop();
      return;
    }
    Alert.alert("Stop Workout?", "Your progress will be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Stop & Save", style: "destructive", onPress: handleStop },
    ]);
  }

  // Waiting for permission
  if (permStatus === "pending") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16 }]}>
        <MaterialCommunityIcons name="map-marker-radius" size={52} color={cfg.color} />
        <Text style={[styles.permTitle, { color: colors.foreground }]}>Requesting Permissions</Text>
        <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
          Dokra needs location access to track your route and distance in real time.
        </Text>
      </View>
    );
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
          {paused ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.time + "22" }]}>
              <Text style={[styles.statusText, { color: colors.time }]}>PAUSED</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: "#FF444422" }]}>
              <View style={[styles.liveDot, { backgroundColor: "#FF4444" }]} />
              <Text style={[styles.statusText, { color: "#FF4444" }]}>LIVE</Text>
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
          value={formatDistance(distanceKm)}
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
          value={displaySpeed.toFixed(1)}
          unit="km/h"
          color={colors.primary}
          icon="speedometer"
          colors={colors}
        />
        <TrackingMetric
          label="Avg Pace"
          value={formatPace(pace)}
          unit="min/km"
          color={colors.time}
          icon="timer-outline"
          colors={colors}
        />
        {(cfg.stepsPerKm > 0 || pedometerAvailable.current) && (
          <TrackingMetric
            label={pedometerAvailable.current ? "Steps (sensor)" : "Steps (est.)"}
            value={steps > 0 ? steps.toLocaleString() : Math.round(distanceKm * cfg.stepsPerKm).toLocaleString()}
            unit=""
            color={colors.steps}
            icon="walk"
            colors={colors}
          />
        )}
        <TrackingMetric
          label="GPS"
          value="Active"
          unit=""
          color="#00E676"
          icon="crosshairs-gps"
          colors={colors}
        />
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
          style={[styles.stopBtn]}
          onPress={confirmStop}
        >
          <LinearGradient
            colors={["#FF4444", "#CC0000"]}
            style={styles.stopGradient}
          >
            <MaterialCommunityIcons name="stop" size={36} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TrackingMetric({
  label, value, unit, color, icon, colors,
}: {
  label: string; value: string; unit: string;
  color: string; icon: string; colors: any;
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
  permTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  permSub: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 32 },
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, gap: 12, paddingBottom: 12,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  typeLabel: { fontSize: 13, fontWeight: "600" },
  pauseIndicator: { flex: 1, alignItems: "flex-end" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  timerSection: { alignItems: "center", paddingTop: 24, paddingBottom: 32, gap: 6 },
  timerLabel: { fontSize: 14, fontWeight: "500", letterSpacing: 1, textTransform: "uppercase" },
  timer: { fontSize: 72, fontWeight: "800", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
  metric: {
    flex: 1, minWidth: "45%", borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 2, alignItems: "flex-start",
  },
  metricValue: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  metricUnit: { fontSize: 12 },
  metricLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 20, marginTop: "auto", paddingHorizontal: 24,
  },
  controlBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  controlLabel: { fontSize: 15, fontWeight: "600" },
  stopBtn: { width: 72, height: 72, borderRadius: 36, overflow: "hidden" },
  stopGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
});
