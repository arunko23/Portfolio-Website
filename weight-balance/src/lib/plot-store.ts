import { create } from "zustand";

export type WeightUnit = "kg" | "lb";
export type CgUnit = "mm" | "in";

export type PlottedPoint = {
  id: number;
  rawWeight: number;
  weightUnit: WeightUnit;
  rawCg: number;
  cgUnit: CgUnit;
  weightKg: number;
  cgMm: number;
};

type PlotState = {
  points: PlottedPoint[];
  nextId: number;
  connect: boolean;
  crosshair: boolean;
  showCgLine: boolean;
  readMode: boolean;
  zoom: number;
  printRequest: number;
  addPoint: (p: Omit<PlottedPoint, "id">) => void;
  removePoint: (id: number) => void;
  clearLast: () => void;
  clearAll: () => void;
  setConnect: (v: boolean) => void;
  setCrosshair: (v: boolean) => void;
  setShowCgLine: (v: boolean) => void;
  setReadMode: (v: boolean) => void;
  setZoom: (z: number) => void;
  requestPrint: () => void;
};

export const usePlotStore = create<PlotState>()((set) => ({
  points: [],
  nextId: 1,
  connect: true,
  crosshair: false,
  showCgLine: true,
  readMode: false,
  zoom: 1,
  printRequest: 0,
  addPoint: (p) =>
    set((s) => ({
      points: [...s.points, { ...p, id: s.nextId }],
      nextId: s.nextId + 1,
    })),
  removePoint: (id) => set((s) => ({ points: s.points.filter((pt) => pt.id !== id) })),
  clearLast: () => set((s) => ({ points: s.points.slice(0, -1) })),
  clearAll: () => set({ points: [] }),
  setConnect: (connect) => set({ connect }),
  setCrosshair: (crosshair) => set({ crosshair }),
  setShowCgLine: (showCgLine) => set({ showCgLine }),
  setReadMode: (readMode) => set({ readMode }),
  setZoom: (zoom) => set({ zoom: Math.max(0.75, Math.min(2.5, zoom)) }),
  requestPrint: () => set((s) => ({ printRequest: s.printRequest + 1 })),
}));
