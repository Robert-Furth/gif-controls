export type RightClickMessage = {
  name: "right-click";
  targetElementId?: number;
};

type Message = RightClickMessage;

export function isMessage(m: unknown): m is Message {
  return m instanceof Object && "name" in m;
}
