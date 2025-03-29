import { storage } from "wxt/storage";

export type CounterType = "frame" | "time" | "none";

export const opts = {
  defaultCounterType: storage.defineItem<CounterType>("local:opt:defaultCounterType", {
    fallback: "frame",
  }),

  minPlayerWidth: storage.defineItem<string>("local:opt:minWidth", {
    fallback: "",
  }),

  minPlayerHeight: storage.defineItem<string>("local:opt:minHeight", {
    fallback: "60px",
  }),

  minFrameTime: storage.defineItem<number>("local:opt:minFrameTime", { fallback: 2 }),

  decodeInBackground: storage.defineItem<boolean>("local:opt:decodeInBackground", {
    fallback: true,
  }),
};

export type PlayerOptions = {
  defaultCounterType: CounterType;
  decodeInBackground: boolean;
};
