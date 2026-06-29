import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useWorkouts } from "@/context/WorkoutContext";
import { useProfile } from "@/context/ProfileContext";
import { formatDistance, formatDuration } from "@/utils/format";
import { Workout, WORKOUT_CONFIGS } from "@/constants/workout";

type Badge = { id: string; label: string; icon: string; color: string; earned: boolean };

function getBadges(workouts: Workout[]): Badge[] {
  const types = new Set(workouts.map((w) => w.type));
  const totalDist = workouts.reduce((s, w) => s + w.distance, 0);
  const totalSteps = workouts.reduce((s, w) => s + w.steps, 0);
  return [
    { id: "first_walk", label: "First Walk", icon: "walk", color: "#00E676", earned: types.has("walk") },
    { id: "first_run", label: "First Run", icon: "run", color: "#00D4FF", earned: types.has("run") },
    { id: "first_ride", label: "First Ride", icon: "bike", color: "#FFD60A", earned: types.has("cycle") },
    { id: "10km", label: "10 km", icon: "map-marker-check", color: "#C56AFF", earned: totalDist >= 10 },
    { id: "50km", label: "50 km", icon: "medal", color: "#FF9800", earned: totalDist >= 50 },
    { id: "100km", label: "100 km", icon: "trophy", color: "#FFD700", earned: totalDist >= 100 },
    { id: "steps10k", label: "10K Steps", icon: "shoe-print", color: "#FF6B35", earned: totalSteps >= 10000 },
    { id: "consistent", label: "5 Workouts", icon: "fire", color: "#FF4444", earned: workouts.length >= 5 },
  ];
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workouts } = useWorkouts();
  const { profile, updateProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [weight, setWeight] = useState(profile.weightKg.toString());
  const [stepGoal, setStepGoal] = useState(profile.dailyStepGoal.toString());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const badges = getBadges(workouts);
  const earned = badges.filter((b) => b.earned).length;

  const totalDist = workouts.reduce((s, w) => s + w.distance, 0);
  const totalCal = workouts.reduce((s, w) => s + w.calories, 0);
  const totalDur = workouts.reduce((s, w) => s + w.duration, 0);

  async function handleSave() {
    await updateProfile({
      name: name.trim() || profile.name,
      bio: bio.trim(),
      weightKg: parseFloat(weight) || profile.weightKg,
      dailyStepGoal: parseInt(stepGoal) || profile.dailyStepGoal,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: editing ? colors.primary : colors.card, borderColor: colors.border }]}
          onPress={editing ? handleSave : () => setEditing(true)}
        >
          <MaterialCommunityIcons
            name={editing ? "check" : "pencil-outline"}
            size={18}
            color={editing ? colors.primaryForeground : colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
          <Text style={[styles.avatarLetter, { color: colors.primary }]}>
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {editing ? (
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
          />
        ) : (
          <Text style={[styles.nameText, { color: colors.foreground }]}>{profile.name}</Text>
        )}
        {editing ? (
          <TextInput
            style={[styles.bioInput, { color: colors.mutedForeground, borderColor: colors.border }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Your bio"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        ) : (
          <Text style={[styles.bioText, { color: colors.mutedForeground }]}>{profile.bio}</Text>
        )}
      </View>

      {/* All-time stats */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>All Time</Text>
        <View style={styles.statsGrid}>
          <BigStat label="Workouts" value={workouts.length.toString()} color={colors.primary} />
          <BigStat label="Distance" value={`${formatDistance(totalDist)} km`} color={colors.distance} />
          <BigStat label="Calories" value={`${Math.round(totalCal)}`} color={colors.calories} />
          <BigStat label="Duration" value={formatDuration(totalDur)} color={colors.time} />
        </View>
      </View>

      {/* Settings */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Settings</Text>
        <SettingRow
          label="Weight"
          value={editing ? undefined : `${profile.weightKg} kg`}
          editing={editing}
          editValue={weight}
          onChangeEdit={setWeight}
          icon="scale-bathroom"
          color={colors.mutedForeground}
          keyboardType="numeric"
          colors={colors}
        />
        <SettingRow
          label="Daily step goal"
          value={editing ? undefined : profile.dailyStepGoal.toLocaleString()}
          editing={editing}
          editValue={stepGoal}
          onChangeEdit={setStepGoal}
          icon="shoe-print"
          color={colors.steps}
          keyboardType="numeric"
          colors={colors}
        />
        <SettingRow
          label="Height"
          value={`${profile.heightCm} cm`}
          editing={false}
          icon="human-male-height"
          color={colors.mutedForeground}
          colors={colors}
        />
        <SettingRow
          label="Age"
          value={`${profile.age} yrs`}
          editing={false}
          icon="calendar-account"
          color={colors.mutedForeground}
          colors={colors}
        />
      </View>

      {/* Achievements */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Achievements</Text>
          <Text style={[styles.badgeCount, { color: colors.primary }]}>
            {earned}/{badges.length}
          </Text>
        </View>
        <View style={styles.badgesGrid}>
          {badges.map((b) => (
            <View
              key={b.id}
              style={[
                styles.badge,
                {
                  backgroundColor: b.earned ? b.color + "22" : colors.surface,
                  borderColor: b.earned ? b.color + "44" : colors.border,
                  opacity: b.earned ? 1 : 0.5,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={b.icon as any}
                size={24}
                color={b.earned ? b.color : colors.mutedForeground}
              />
              <Text style={{ fontSize: 10, color: b.earned ? b.color : colors.mutedForeground, textAlign: "center" }}>
                {b.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: Platform.OS === "web" ? 100 : 90 }} />
    </ScrollView>
  );
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#8A8A9A" }}>{label}</Text>
    </View>
  );
}

function SettingRow({
  label,
  value,
  editing,
  editValue,
  onChangeEdit,
  icon,
  color,
  keyboardType,
  colors,
}: {
  label: string;
  value?: string;
  editing: boolean;
  editValue?: string;
  onChangeEdit?: (v: string) => void;
  icon: string;
  color: string;
  keyboardType?: "numeric" | "default";
  colors: any;
}) {
  return (
    <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      {editing && onChangeEdit ? (
        <TextInput
          style={[styles.settingInput, { color: colors.foreground, borderColor: colors.border }]}
          value={editValue}
          onChangeText={onChangeEdit}
          keyboardType={keyboardType || "default"}
          placeholderTextColor={colors.mutedForeground}
        />
      ) : (
        <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },
  editBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarSection: { alignItems: "center", gap: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarLetter: { fontSize: 36, fontWeight: "800" },
  nameText: { fontSize: 22, fontWeight: "700" },
  nameInput: { fontSize: 20, fontWeight: "600", borderBottomWidth: 1, paddingVertical: 4, paddingHorizontal: 8, minWidth: 120, textAlign: "center" },
  bioText: { fontSize: 14, textAlign: "center" },
  bioInput: { fontSize: 14, borderBottomWidth: 1, paddingVertical: 4, textAlign: "center", minWidth: 200 },
  card: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 14 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badgeCount: { fontSize: 14, fontWeight: "600" },
  statsGrid: { flexDirection: "row", gap: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopWidth: 1 },
  settingLabel: { flex: 1, fontSize: 15 },
  settingValue: { fontSize: 15, fontWeight: "500" },
  settingInput: { fontSize: 15, borderBottomWidth: 1, paddingVertical: 2, paddingHorizontal: 4, minWidth: 60, textAlign: "right" },
  badgesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { width: "22%", flexGrow: 1, alignItems: "center", borderRadius: 12, padding: 12, gap: 4, borderWidth: 1 },
});
