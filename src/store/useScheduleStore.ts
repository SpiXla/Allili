import { create } from "zustand";

/** Represents a single task in the generated timeline/schedule. */
export interface Task {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  date?: string; // YYYY-MM-DD
  duration: number; // in minutes
  priority: "low" | "medium" | "high";
  category: string;
  completed: boolean;
}

/** User preferences for schedule & prompt optimization */
export interface UserPreferences {
  priorityFocus: "deep-work" | "balanced" | "wellness";
  includeMorningRoutine: boolean;
  includeMeals: boolean;
  includeWorkout: boolean;
  includeSleep: boolean;
  includeBuffers: boolean;
  focusWindow: "morning" | "afternoon" | "flexible";
  customNotes: string;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  priorityFocus: "deep-work",
  includeMorningRoutine: true,
  includeMeals: true,
  includeWorkout: true,
  includeSleep: true,
  includeBuffers: true,
  focusWindow: "morning",
  customNotes: "",
};

interface ScheduleState {
  /** Raw user input describing what they want to schedule. */
  userInput: string;
  /** Whether the AI is currently generating a schedule. */
  isLoading: boolean;
  /** The generated timeline of tasks. */
  timelineData: Task[];
  /** User preferences for prompt optimization. */
  preferences: UserPreferences;

  // ── Actions ───────────────────────────────────────────
  setUserInput: (input: string) => void;
  setIsLoading: (loading: boolean) => void;
  setTimelineData: (data: Task[]) => void;
  setPreferences: (updates: Partial<UserPreferences>) => void;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  toggleTaskCompleted: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  reset: () => void;
}

const initialState = {
  userInput: "",
  isLoading: false,
  timelineData: [],
  preferences: DEFAULT_USER_PREFERENCES,
};

export const useScheduleStore = create<ScheduleState>()((set) => ({
  ...initialState,

  setUserInput: (input) => set({ userInput: input }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setTimelineData: (data) => set({ timelineData: data }),
  setPreferences: (updates) =>
    set((state) => ({
      preferences: { ...state.preferences, ...updates },
    })),

  addTask: (task) =>
    set((state) => ({ timelineData: [...state.timelineData, task] })),

  removeTask: (id) =>
    set((state) => ({
      timelineData: state.timelineData.filter((t) => t.id !== id),
    })),

  toggleTaskCompleted: (id) =>
    set((state) => ({
      timelineData: state.timelineData.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      timelineData: state.timelineData.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  reset: () =>
    set({
      userInput: "",
      isLoading: false,
      timelineData: [],
      // Keep preferences so user doesn't lose their configured daily habits
    }),
}));
