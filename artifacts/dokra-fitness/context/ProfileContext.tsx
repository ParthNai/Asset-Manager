import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "@dokra/profile";

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  dailyStepGoal: number;
  dailyDistanceGoal: number;
  dailyCalorieGoal: number;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Athlete",
  username: "dokra_user",
  bio: "Chasing personal records every day 🏃",
  gender: "other",
  age: 28,
  heightCm: 175,
  weightKg: 70,
  dailyStepGoal: 10000,
  dailyDistanceGoal: 5,
  dailyCalorieGoal: 500,
};

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be inside ProfileProvider");
  return ctx;
}
