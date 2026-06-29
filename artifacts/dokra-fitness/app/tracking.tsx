import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Pedometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
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
import LiveMap from "@/components/LiveMap";

const { height: SCREEN_H } = Dimensions.get("window");
const MAP_HEIGHT = SCREEN_H * 0.42;

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

type Coord = { latitude: number; longitude: number };

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

  // GPS + route
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [routeCoords, setRouteCoords] = useState<Coord[]>([]);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number; longitude: number;
    latitudeDelta: number; longitudeDelta: number;
  } | null>(null);
  const currentSpeedRef = useRef(0);
  const lastCoordRef = useRef<{ lat: number; lon: number } | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // Pedometer
  const [steps, setSteps] = useState(0);
  const pedometerSubRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const pedometerAvailable = useRef(false);

  // Timer
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const topPad = insets.top;
  const bottomPad = insets.bottom || 34;

  const calories = cfg.met * profile.weightKg * (movingElapsed / 3600);
  const pace = movingElapsed > 0 && distanceKm > 0.01 ? movingElapsed / distanceKm : 0;
  const displaySpeed = currentSpeed * 3.6;

  useEffect(() => {
    requestAndStart();
    return cleanup;
  }, []);

  async function requestAndStart() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPermStatus("denied");
      Alert.alert(
        "Location Required",
        "Dokra needs location access to track your workout route.",
        [{ text: "OK", onPress: () => router.back() }]
      );
      return;
    }
    await Location.requestBackgroundPermissionsAsync().catch(() => {});
    setPermStatus("granted");

    // Get initial position to centre the map
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setMapRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
      setRouteCoords([{ latitude, longitude }]);
      lastCoordRef.current = { lat: latitude, lon: longitude };
    } catch (_) {}

    // Pedometer
    const ok = await Pedometer.isAvailableAsync().catch(() => false);
    pedometerAvailable.current = ok;
    if (ok) {
      pedometerSubRef.current = Pedometer.watchStepCount((r) => setSteps(r.steps));
    }

    startTimeRef.current = Date.now();
    startGPS();
    startTimer();
  }

  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
      if (currentSpeedRef.current > 1.0) {
        setMovingElapsed((e) => e + 1);
      }
    }, 1000);
  }

  function stopTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function startGPS() {
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
      (loc) => {
        const { latitude, longitude, speed } = loc.coords;
        if (lastCoordRef.current) {
          const meters = calcDistanceMeters(
            lastCoordRef.current.lat, lastCoordRef.current.lon,
            latitude, longitude
          );
          if (meters > 2 && meters < 50) {
            setDistanceKm((prev) => prev + meters / 1000);
            setRouteCoords((prev) => [...prev, { latitude, longitude }]);
            setMapRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            if (speed !== null && speed > 0) {
              currentSpeedRef.current = speed;
              setCurrentSpeed(speed);
            }
          } else if (meters <= 2) {
            currentSpeedRef.current = 0;
            setCurrentSpeed(0);
          }
        }
        lastCoordRef.current = { lat: latitude, lon: longitude };
      }
    ).then((sub) => { locationSubRef.current = sub; });
  }

  function stopGPS() {
    const sub = locationSubRef.current;
    if (sub != null) {
      if (typeof (sub as any).remove === "function") {
        try { (sub as any).remove(); } catch (_) {}
      } else if (typeof (sub as any).subscription?.remove === "function") {
        try { (sub as any).subscription.remove(); } catch (_) {}
      }
    }
    locationSubRef.current = null;
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
      startTimer(); startGPS(); setPaused(false);
    } else {
      stopTimer(); stopGPS(); lastCoordRef.current = null; setPaused(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function handleStop() {
    cleanup();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const finalSteps = pedometerAvailable.current ? steps : Math.round(distanceKm * cfg.stepsPerKm);
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
        workoutId: workout.id, type: workoutType,
        duration: elapsed.toString(), distance: distanceKm.toString(),
        steps: finalSteps.toString(), calories: calories.toString(),
      },
    });
  }

  function confirmStop() {
    if (elapsed < 10) { handleStop(); return; }
    Alert.alert("Stop Workout?", "Your progress will be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Stop & Save", style: "destructive", onPress: handleStop },
    ]);
  }

  // Waiting for permission
  if (permStatus === "pending") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }]}>
        <MaterialCommunityIcons name="map-marker-radius" size={52} color={cfg.color} />
        <Text style={[styles.permTitle, { color: colors.foreground }]}>Requesting GPS</Text>
        <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
          Dokra needs location access to track your route and measure real distance.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── MAP (platform-split: native gets real MapView, web gets stub) ── */}
      <LiveMap
        height={MAP_HEIGHT}
        routeCoords={routeCoords}
        mapRegion={mapRegion}
        routeColor={cfg.color}
        topPad={topPad}
        cfg={cfg}
        paused={paused}
        onClose={confirmStop}
      />

      {/* ── STATS + CONTROLS ── */}
      <View style={styles.statsPanel}>
        {/* Timer */}
        <View style={styles.timerRow}>
          <View>
            <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>DURATION</Text>
            <Text style={[styles.timer, { color: colors.foreground }]}>{formatDuration(elapsed)}</Text>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: paused ? colors.muted : "#EF444422" }]}>
            {!paused && <View style={styles.liveDot} />}
            <Text style={[styles.liveText, { color: paused ? colors.mutedForeground : "#EF4444" }]}>
              {paused ? "PAUSED" : "LIVE"}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <Metric icon="map-marker-distance" label="Distance" value={formatDistance(distanceKm)} unit="km" color={colors.distance} colors={colors} />
          <Metric icon="fire" label="Calories" value={Math.round(calories).toString()} unit="kcal" color={colors.calories} colors={colors} />
          <Metric icon="speedometer" label="Speed" value={displaySpeed.toFixed(1)} unit="km/h" color={colors.primary} colors={colors} />
          <Metric icon="timer-outline" label="Avg Pace" value={formatPace(pace)} unit="/km" color={colors.time} colors={colors} />
          {cfg.stepsPerKm > 0 && (
            <Metric icon="walk" label={pedometerAvailable.current ? "Steps" : "Steps (est.)"} value={(steps || Math.round(distanceKm * cfg.stepsPerKm)).toLocaleString()} unit="" color={colors.steps} colors={colors} />
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: bottomPad + 12 }]}>
          <TouchableOpacity
            style={[styles.pauseBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handlePause}
          >
            <MaterialCommunityIcons name={paused ? "play" : "pause"} size={24} color={colors.foreground} />
            <Text style={[styles.pauseLabel, { color: colors.foreground }]}>{paused ? "Resume" : "Pause"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopBtn} onPress={confirmStop}>
            <LinearGradient colors={["#EF4444", "#B91C1C"]} style={styles.stopGrad}>
              <MaterialCommunityIcons name="stop" size={32} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


function Metric({ icon, label, value, unit, color, colors }: any) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      {!!unit && <Text style={[styles.metricUnit, { color: colors.mutedForeground }]}>{unit}</Text>}
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  permTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  permSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  webMapPlaceholder: { alignItems: "center", justifyContent: "center" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, gap: 8, paddingBottom: 12,
  },
  closeBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  typeLabel: { fontSize: 12, fontWeight: "600" },
  statsPanel: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  timerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  timerLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  timer: { fontSize: 52, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  liveText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  metric: {
    flex: 1, minWidth: "44%", borderRadius: 14, borderWidth: 1,
    padding: 12, gap: 1,
  },
  metricValue: { fontSize: 20, fontWeight: "700", marginTop: 3 },
  metricUnit: { fontSize: 11 },
  metricLabel: { fontSize: 10, fontWeight: "500" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: "auto" },
  pauseBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  pauseLabel: { fontSize: 15, fontWeight: "600" },
  stopBtn: { width: 68, height: 68, borderRadius: 34, overflow: "hidden" },
  stopGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});

