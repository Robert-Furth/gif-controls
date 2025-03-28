import { storage } from "wxt/storage";

export type CounterType = "frame" | "time" | "none";

export namespace opts {
  export const defaultCounterType = storage.defineItem<CounterType>(
    "local:opt:defaultCounterType",
    {
      fallback: "frame",
    },
  );

  export const minPlayerWidth = storage.defineItem<string>("local:opt:minWidth", {
    fallback: "",
  });

  export const minPlayerHeight = storage.defineItem<string>("local:opt:minHeight", {
    fallback: "60px",
  });

  export const minFrameTime = storage.defineItem<number>("local:opt:minFrameTime", { fallback: 2 });

  export const decodeInBackground = storage.defineItem<boolean>("local:opt:decodeInBackground", {
    fallback: true,
  });
}

export type PlayerOptions = {
  defaultCounterType: CounterType;
  decodeInBackground: boolean;
};
