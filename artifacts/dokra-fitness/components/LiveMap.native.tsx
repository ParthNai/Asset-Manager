import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Coord = { latitude: number; longitude: number };

interface Props {
  height: number;
  routeCoords: Coord[];
  mapRegion: {
    latitude: number; longitude: number;
    latitudeDelta: number; longitudeDelta: number;
  } | null;
  routeColor: string;
  topPad: number;
  cfg: { icon: string; label: string; color: string };
  paused: boolean;
  onClose: () => void;
}

export default function LiveMap({
  height, routeCoords, mapRegion, routeColor,
  topPad, cfg, paused, onClose,
}: Props) {
  return (
    <View style={{ height }}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={mapRegion ?? undefined}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        pitchEnabled={false}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={routeColor}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Top bar overlay */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
        >
          <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
          <MaterialCommunityIcons name={cfg.icon as any} size={14} color={cfg.color} />
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        <View style={[
          styles.badge,
          { backgroundColor: paused ? "rgba(255,255,255,0.92)" : "rgba(239,68,68,0.15)" }
        ]}>
          {!paused && <View style={styles.liveDot} />}
          <Text style={[
            styles.badgeText,
            { color: paused ? "#64748B" : "#EF4444", letterSpacing: 0.5 }
          ]}>
            {paused ? "PAUSED" : "LIVE GPS"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, gap: 8, paddingBottom: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
});
