import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Coord = { latitude: number; longitude: number };

interface Props {
  height: number;
  routeCoords: Coord[];
  mapRegion: any;
  routeColor: string;
  topPad: number;
  cfg: { icon: string; label: string; color: string };
  paused: boolean;
  onClose: () => void;
}

export default function LiveMap({ height, cfg, paused, onClose, topPad }: Props) {
  return (
    <View style={[styles.container, { height }]}>
      <MaterialCommunityIcons name="map-outline" size={40} color="#94A3B8" />
      <Text style={styles.text}>Live map available in the mobile app</Text>

      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.badge}>
          <MaterialCommunityIcons name={cfg.icon as any} size={14} color={cfg.color} />
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={styles.badge}>
          {!paused && <View style={styles.liveDot} />}
          <Text style={[styles.badgeText, { color: paused ? "#64748B" : "#EF4444" }]}>
            {paused ? "PAUSED" : "LIVE"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E2E8F0",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  text: { color: "#64748B", fontSize: 13 },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, gap: 8, paddingBottom: 12,
  },
  closeBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
});
