import { mount } from "svelte";
import { WxtStorageItem } from "wxt/storage";

// import OptionsPage from "@/components/options-page/OptionsPage.svelte";
import { CounterType, opts } from "@/lib/options";

// mount(OptionsPage, { target: document.body });

interface ToString {
  toString: () => string;
}

type BindOptionParams<T> = {
  elementId: string;
  storageItem: WxtStorageItem<T, Record<string, unknown>>;
  resetId?: string;
};

function bindOption<T extends ToString>(
  options: BindOptionParams<T> & {
    converter: (value: string) => undefined | T;
    invalidMessage?: string;
  },
) {
  const { elementId, storageItem, resetId, converter, invalidMessage = "Invalid." } = options;
  const element = document.getElementById(elementId);

  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement))
    throw new Error();

  storageItem.getValue().then((val) => (element.value = val.toString()));

  element.addEventListener("input", () => {
    const val = converter(element.value);

    if (val !== undefined) {
      element.setCustomValidity("");
      element.classList.remove("invalid");
      storageItem.setValue(val);
    } else {
      element.setCustomValidity(invalidMessage);
      element.reportValidity();
      element.classList.add("invalid");
    }
  });

  if (!resetId) return;
  const resetButton = document.getElementById(resetId);
  if (!resetButton) return;

  resetButton.addEventListener("click", () => {
    storageItem.setValue(storageItem.fallback);
    element.value = storageItem.fallback.toString();
  });
}

function bindCheckbox(options: BindOptionParams<boolean> & { invert?: boolean }) {
  const { elementId, storageItem, resetId, invert } = options;
  const element = document.getElementById(elementId);

  if (!(element instanceof HTMLInputElement)) throw new Error();
  const inv = (v: boolean) => (invert ? !v : v);

  storageItem.getValue().then((val) => (element.checked = inv(val)));

  element.addEventListener("input", () => {
    storageItem.setValue(inv(element.checked));
  });

  if (!resetId) return;
  const resetButton = document.getElementById(resetId);
  if (!resetButton) return;

  resetButton.addEventListener("click", () => {
    storageItem.setValue(storageItem.fallback);
    element.checked = inv(storageItem.fallback);
  });
}

function toCounterType(v: string): CounterType | undefined {
  switch (v) {
    case "frame":
    case "time":
    case "none":
      return v;
  }
  return undefined;
}

function toCssLength(v: string): string | undefined {
  const s = v.trim();
  if (s === "" || /^-?\d+(px|em|rem)$/.test(s)) return s;
  return undefined;
}

function toNonnegativeInt(v: string): number | undefined {
  const s = v.trim();
  if (!/^\d+$/.test(s)) return undefined;
  return Number.parseInt(v, 10);
}

bindOption({
  elementId: "default-counter-type",
  resetId: "reset-counter-type",
  storageItem: opts.defaultCounterType,
  converter: toCounterType,
});
bindOption({
  elementId: "min-width",
  resetId: "reset-player-min-size",
  storageItem: opts.minPlayerWidth,
  converter: toCssLength,
  invalidMessage: "Must be blank or a width in px/em/rem.",
});
bindOption({
  elementId: "min-height",
  resetId: "reset-player-min-size",
  storageItem: opts.minPlayerHeight,
  converter: toCssLength,
  invalidMessage: "Must be blank or a width in px/em/rem.",
});
bindOption({
  elementId: "min-frame-delay",
  resetId: "reset-min-frame-delay",
  storageItem: opts.minFrameTime,
  converter: toNonnegativeInt,
  invalidMessage: "Must be a nonnegative whole number.",
});
bindCheckbox({
  elementId: "decode-in-background",
  storageItem: opts.decodeInBackground,
});
