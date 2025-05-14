import { storage, WxtStorageItem } from "#imports";
import { onMount } from "svelte";
import { writable } from "svelte/store";

export type CounterType = "frame" | "time" | "none";

export const opts = {
  defaultCounterType: storage.defineItem<CounterType>("local:opt:defaultCounterType", {
    fallback: "time",
  }),

  minPlayerWidth: storage.defineItem<number>("local:opt:minWidth", {
    fallback: 120,
  }),

  minPlayerHeight: storage.defineItem<number>("local:opt:minHeight", {
    fallback: 60,
  }),

  minFrameTime: storage.defineItem<number>("local:opt:minFrameTime", { fallback: 2 }),

  defaultLockState: storage.defineItem<boolean>("local:opt:defaultPosAndSizeLock", {
    fallback: false,
  }),
} as const;

export type PlayerOptions = {
  defaultCounterType: CounterType;
  decodeInBackground: boolean;
};

export function watchOption<T>(
  option: WxtStorageItem<T, Record<string, unknown>>,
  initialValue?: T,
) {
  const store = writable(initialValue ?? option.fallback);
  void option.getValue().then((v) => store.set(v));

  onMount(() => {
    return option.watch((v) => store.set(v));
  });
  return store;
}
