import { create } from "zustand";

/** Represents a single task in the generated timeline/schedule. */
export interface Task {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  priority: "low" | "medium" | "high";
  category: string;
  completed: boolean;
}

interface ScheduleState {
  /** Raw user input describing what they want to schedule. */
  userInput: string;
  /** Whether the AI is currently generating a schedule. */
  isLoading: boolean;
  /** The generated timeline of tasks. */
  timelineData: Task[];

  // ── Actions ───────────────────────────────────────────
  setUserInput: (input: string) => void;
  setIsLoading: (loading: boolean) => void;
  setTimelineData: (data: Task[]) => void;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  toggleTaskCompleted: (id: string) => void;
  reset: () => void;
}

const initialState = {
  userInput: "",
  isLoading: false,
  timelineData: [],
};

export const useScheduleStore = create<ScheduleState>()((set) => ({
  ...initialState,

  setUserInput: (input) => set({ userInput: input }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setTimelineData: (data) => set({ timelineData: data }),

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

  reset: () => set(initialState),
}));
