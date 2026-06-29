import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
}

export function StatCard({ label, value, unit, icon, color }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LinearGradient
        colors={[color + "22", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>
        {value}
        <Text style={[styles.unit, { color: colors.mutedForeground }]}> {unit}</Text>
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 100,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  unit: {
    fontSize: 13,
    fontWeight: "400",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
