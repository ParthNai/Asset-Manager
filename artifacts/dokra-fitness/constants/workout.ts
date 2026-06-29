export type WorkoutType = "walk" | "run" | "cycle" | "hike" | "trek" | "skate";

export interface WorkoutConfig {
  label: string;
  icon: string;
  color: string;
  speed: number;
  met: number;
  stepsPerKm: number;
}

export const WORKOUT_CONFIGS: Record<WorkoutType, WorkoutConfig> = {
  walk: {
    label: "Walking",
    icon: "walk",
    color: "#00E676",
    speed: 4.5,
    met: 3.5,
    stepsPerKm: 1300,
  },
  run: {
    label: "Running",
    icon: "run",
    color: "#00D4FF",
    speed: 9,
    met: 8,
    stepsPerKm: 1100,
  },
  cycle: {
    label: "Cycling",
    icon: "bike",
    color: "#FFD60A",
    speed: 20,
    met: 7,
    stepsPerKm: 0,
  },
  hike: {
    label: "Hiking",
    icon: "hiking",
    color: "#FF9800",
    speed: 4,
    met: 5,
    stepsPerKm: 1350,
  },
  trek: {
    label: "Trekking",
    icon: "tent",
    color: "#C56AFF",
    speed: 3.5,
    met: 6,
    stepsPerKm: 1400,
  },
  skate: {
    label: "Skating",
    icon: "rollerblade",
    color: "#FF6B35",
    speed: 15,
    met: 7,
    stepsPerKm: 0,
  },
};

export interface Workout {
  id: string;
  type: WorkoutType;
  startTime: number;
  duration: number;
  distance: number;
  steps: number;
  calories: number;
  avgPace: number;
  avgSpeed: number;
}
