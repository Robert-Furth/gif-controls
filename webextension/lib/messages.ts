export type RightClickMessage = {
  name: "right-click";
  targetElementId?: number;
};

export type OpenOptionsMessage = {
  name: "open-options";
};

type Message = RightClickMessage | OpenOptionsMessage;

export function isMessage(m: unknown): m is Message {
  return m instanceof Object && "name" in m;
}
