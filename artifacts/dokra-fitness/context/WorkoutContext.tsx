import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Workout } from "@/constants/workout";

const STORAGE_KEY = "@dokra/workouts";

interface DayStats {
  steps: number;
  distance: number;
  calories: number;
  duration: number;
}

interface WorkoutContextType {
  workouts: Workout[];
  addWorkout: (w: Workout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getTodayStats: () => DayStats;
  getWeeklyData: () => number[];
  loaded: boolean;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setWorkouts(JSON.parse(raw));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (updated: Workout[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addWorkout = useCallback(
    async (w: Workout) => {
      const updated = [w, ...workouts];
      setWorkouts(updated);
      await persist(updated);
    },
    [workouts, persist]
  );

  const deleteWorkout = useCallback(
    async (id: string) => {
      const updated = workouts.filter((w) => w.id !== id);
      setWorkouts(updated);
      await persist(updated);
    },
    [workouts, persist]
  );

  const getTodayStats = useCallback((): DayStats => {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const todayWorkouts = workouts.filter((w) => w.startTime >= todayStart);
    return todayWorkouts.reduce(
      (acc, w) => ({
        steps: acc.steps + w.steps,
        distance: acc.distance + w.distance,
        calories: acc.calories + w.calories,
        duration: acc.duration + w.duration,
      }),
      { steps: 0, distance: 0, calories: 0, duration: 0 }
    );
  }, [workouts]);

  const getWeeklyData = useCallback((): number[] => {
    const now = Date.now();
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - i * 86400000;
      const dayEnd = dayStart + 86400000;
      const dayWorkouts = workouts.filter(
        (w) => w.startTime >= dayStart && w.startTime < dayEnd
      );
      const totalKm = dayWorkouts.reduce((sum, w) => sum + w.distance, 0);
      days.push(Math.round(totalKm * 10) / 10);
    }
    return days;
  }, [workouts]);

  return (
    <WorkoutContext.Provider
      value={{ workouts, addWorkout, deleteWorkout, getTodayStats, getWeeklyData, loaded }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkouts() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkouts must be inside WorkoutProvider");
  return ctx;
}
