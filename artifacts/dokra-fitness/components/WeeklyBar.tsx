import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  data: number[];
}

export function WeeklyBar({ data }: Props) {
  const colors = useColors();
  const max = Math.max(...data, 1);

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <View style={styles.container}>
      {data.map((val, i) => {
        const pct = val / max;
        const isToday = i === todayIndex;
        return (
          <View key={i} style={styles.col}>
            <View style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(pct * 100, 4)}%`,
                    backgroundColor: isToday ? colors.primary : colors.primary + "44",
                    borderRadius: 6,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: isToday ? colors.primary : colors.mutedForeground },
              ]}
            >
              {DAY_LABELS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 4,
  },
  col: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: 4,
  },
  barWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    minHeight: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
  },
});
