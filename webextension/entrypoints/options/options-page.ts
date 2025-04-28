import { WxtStorageItem } from "#imports";

import { CounterType, opts } from "@/lib/options";

interface ToString {
  toString: () => string;
}

type BindOptionParams<T> = {
  elementId: string;
  storageItem: WxtStorageItem<T, Record<string, unknown>>;
  resetId?: string;
};

function reportError(control: HTMLElement, err: unknown) {
  const div = control.closest(".control");
  if (div === null) return;

  let errDiv = div.querySelector(".error");
  if (errDiv === null) {
    errDiv = document.createElement("div");
    errDiv.className = "error";
    div.appendChild(errDiv);
  }

  errDiv.textContent = "Error: " + (err instanceof Error ? err.message : (err as string));
}

function clearError(control: HTMLElement) {
  const div = control.closest(".control");
  if (div === null) return;
  div.querySelector(".error")?.remove();
}

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

  storageItem
    .getValue()
    .then((val) => (element.value = val.toString()))
    .catch((e) => reportError(element, e));

  element.addEventListener("input", async () => {
    try {
      const val = converter(element.value);

      if (val !== undefined) {
        element.setCustomValidity("");
        element.classList.remove("invalid");
        await storageItem.setValue(val);
      } else {
        element.setCustomValidity(invalidMessage);
        element.reportValidity();
        element.classList.add("invalid");
      }
      clearError(element);
    } catch (e) {
      reportError(element, e);
    }
  });

  if (!resetId) return;
  const resetButton = document.getElementById(resetId);
  if (!resetButton) return;

  resetButton.addEventListener("click", async () => {
    try {
      await storageItem.setValue(storageItem.fallback);
      element.value = storageItem.fallback.toString();
      clearError(element);
    } catch (e) {
      reportError(element, e);
    }
  });
}

function bindCheckbox(options: BindOptionParams<boolean> & { invert?: boolean }) {
  const { elementId, storageItem, resetId, invert } = options;
  const element = document.getElementById(elementId);

  if (!(element instanceof HTMLInputElement)) throw new Error();
  const inv = (v: boolean) => (invert ? !v : v);

  storageItem
    .getValue()
    .then((val) => (element.checked = inv(val)))
    .catch((e) => reportError(element, e));

  element.addEventListener("input", async () => {
    try {
      await storageItem.setValue(inv(element.checked));
      clearError(element);
    } catch (e) {
      reportError(element, e);
    }
  });

  if (!resetId) return;
  const resetButton = document.getElementById(resetId);
  if (!resetButton) return;

  resetButton.addEventListener("click", async () => {
    try {
      await storageItem.setValue(storageItem.fallback);
      element.checked = inv(storageItem.fallback);
      clearError(element);
    } catch (e) {
      reportError(element, e);
    }
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
  converter: toNonnegativeInt,
  invalidMessage: "Must be a nonnegative whole number.",
});
bindOption({
  elementId: "min-height",
  resetId: "reset-player-min-size",
  storageItem: opts.minPlayerHeight,
  converter: toNonnegativeInt,
  invalidMessage: "Must be a nonnegative whole number.",
});
bindOption({
  elementId: "min-frame-delay",
  resetId: "reset-min-frame-delay",
  storageItem: opts.minFrameTime,
  converter: toNonnegativeInt,
  invalidMessage: "Must be a nonnegative whole number.",
});
bindCheckbox({
  elementId: "lock-size-and-pos",
  storageItem: opts.defaultLockState,
});
