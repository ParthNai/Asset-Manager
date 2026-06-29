import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { WorkoutType, WORKOUT_CONFIGS } from "@/constants/workout";

const TYPES: WorkoutType[] = ["walk", "run", "cycle", "hike", "trek", "skate"];

interface Props {
  selected: WorkoutType;
  onSelect: (t: WorkoutType) => void;
}

export function ActivityGrid({ selected, onSelect }: Props) {
  const colors = useColors();

  return (
    <View style={styles.grid}>
      {TYPES.map((type) => {
        const cfg = WORKOUT_CONFIGS[type];
        const isSelected = selected === type;
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.item,
              {
                backgroundColor: isSelected ? cfg.color + "22" : colors.card,
                borderColor: isSelected ? cfg.color : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(type);
            }}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: isSelected ? cfg.color + "33" : colors.surface },
              ]}
            >
              <MaterialCommunityIcons
                name={cfg.icon as any}
                size={28}
                color={isSelected ? cfg.color : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: isSelected ? cfg.color : colors.mutedForeground },
              ]}
            >
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  item: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 16,
    gap: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
