import { create } from "zustand";

export type MushafBulkDownloadStatus =
  | "idle"
  | "running"
  | "completed"
  | "cancelled";

type State = {
  status: MushafBulkDownloadStatus;
  downloaded: number;
  total: number;
  setBulkProgress: (patch: Partial<Pick<State, "status" | "downloaded" | "total">>) => void;
};

export const useMushafBulkDownloadStore = create<State>((set) => ({
  status: "idle",
  downloaded: 0,
  total: 604,
  setBulkProgress: (patch) => set((s) => ({ ...s, ...patch })),
}));
