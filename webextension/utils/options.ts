import { storage } from "wxt/storage";

export type CounterType = "frame" | "time" | "none";

const defaultCounterType = storage.defineItem<CounterType>("local:opt:defaultCounterType", {
  fallback: "frame",
});

export type ExtensionOptions = {
  defaultCounterType: CounterType;
};

export async function getOptions(): Promise<ExtensionOptions> {
  return {
    defaultCounterType: await defaultCounterType.getValue(),
  };
}
