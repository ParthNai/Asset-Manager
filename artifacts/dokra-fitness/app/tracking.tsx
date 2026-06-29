import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Pedometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
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
const MAP_HEIGHT = Math.min(SCREEN_H * 0.36, 280);

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
  const [gpsSignal, setGpsSignal] = useState<"acquiring" | "active" | "none">("acquiring");

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
    // Check existing permission first — avoids pointless re-request
    let { status } = await Location.getForegroundPermissionsAsync();

    if (status !== "granted") {
      // Ask the user
      const result = await Location.requestForegroundPermissionsAsync();
      status = result.status;
    }

    if (status !== "granted") {
      setPermStatus("denied");
      return; // UI shows denied screen with Settings button
    }

    // Background permission: fire-and-forget, never block on it
    Location.requestBackgroundPermissionsAsync().catch(() => {});

    setPermStatus("granted");
    setGpsSignal("acquiring");

    // Pedometer — start immediately, doesn't need GPS
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

      {/* ── STATS (scrollable middle) ── */}
      <View style={styles.statsPanel}>
        {/* Timer row */}
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

        {/* Stats — 3 per row so they stay compact */}
        <View style={styles.statsGrid}>
          <Metric icon="map-marker-distance" label="Distance" value={formatDistance(distanceKm)} unit="km" color={colors.distance} colors={colors} />
          <Metric icon="fire" label="Calories" value={Math.round(calories).toString()} unit="kcal" color={colors.calories} colors={colors} />
          <Metric icon="speedometer" label="Speed" value={displaySpeed.toFixed(1)} unit="km/h" color={colors.primary} colors={colors} />
          <Metric icon="timer-outline" label="Pace" value={formatPace(pace)} unit="/km" color={colors.time} colors={colors} />
          {cfg.stepsPerKm > 0 && (
            <Metric icon="walk" label={pedometerAvailable.current ? "Steps" : "Steps (est.)"} value={(steps || Math.round(distanceKm * cfg.stepsPerKm)).toLocaleString()} unit="" color={colors.steps} colors={colors} />
          )}
        </View>
      </View>

      {/* ── CONTROLS — always pinned at bottom ── */}
      <View style={[styles.controls, { paddingBottom: bottomPad + 8, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.pauseBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handlePause}
        >
          <MaterialCommunityIcons name={paused ? "play" : "pause"} size={26} color={colors.foreground} />
          <Text style={[styles.pauseLabel, { color: colors.foreground }]}>{paused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.stopBtn} onPress={confirmStop}>
          <LinearGradient colors={["#EF4444", "#B91C1C"]} style={styles.stopGrad}>
            <MaterialCommunityIcons name="stop" size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
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
  statsPanel: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
  timerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  timerLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 1 },
  timer: { fontSize: 44, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  liveText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metric: {
    width: "31%", flexGrow: 1, borderRadius: 12, borderWidth: 1,
    padding: 10, gap: 1,
  },
  metricValue: { fontSize: 17, fontWeight: "700", marginTop: 2 },
  metricUnit: { fontSize: 10 },
  metricLabel: { fontSize: 9, fontWeight: "500" },
  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 14, paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#E2E8F0",
  },
  pauseBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 18, borderWidth: 1,
  },
  pauseLabel: { fontSize: 16, fontWeight: "700" },
  stopBtn: { width: 64, height: 64, borderRadius: 32, overflow: "hidden" },
  stopGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});

