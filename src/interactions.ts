import { questions, type Answer } from "./questions";
import { visitFinalMessage, visitOptions, visitQuestion } from "./visit-plan";

export const MAX_INTERACTIONS = 2000;
export type InputMethod = "mouse" | "touch" | "pen" | "keyboard" | "unknown";
export type Interaction = {
  at: string;
  kind:
    | "screen_opened"
    | "option_activated"
    | "answer_changed"
    | "popup_opened"
    | "popup_closed"
    | "button_activated";
  target: string;
  input?: InputMethod;
  selected?: string[];
};
export type InteractionLog = { events: Interaction[]; omitted: number };
export type RecordInteraction = (event: Omit<Interaction, "at">) => void;
export const emptyInteractionLog = (): InteractionLog => ({
  events: [],
  omitted: 0,
});

const screens = Object.fromEntries([
  ["intro", "Begrüßung"],
  ["ready", "Bereit für die Fragen"],
  ["summary", "Wunschzettel"],
  ...questions.map((question) => [question.id, question.title]),
]);
const options = Object.fromEntries([
  ...questions.flatMap((question) =>
    question.options.map((option) => [
      `${question.id}:${option.id}`,
      `${question.title} → ${option.label}`,
    ]),
  ),
  ...visitOptions.map((option) => [
    `visit:${option.id}`,
    `${visitQuestion} → ${option.label}`,
  ]),
]);
const popups = Object.fromEntries([
  ...questions.flatMap((question) =>
    [
      ...(question.reactions ?? []),
      ...(question.reaction ? [question.reaction] : []),
    ].map((reaction) => [
      `${question.id}:${reaction.optionId}`,
      `${reaction.emoji} ${reaction.headline} ${reaction.caption}`,
    ]),
  ),
  ["visit:invitation", `🥳 Juhuuu! ${visitQuestion}`],
  ...visitOptions.map((option) => {
    const message = visitFinalMessage(option.id);
    return [
      `visit:${option.id}`,
      `${message.emoji} ${message.headline} ${message.caption}`,
    ];
  }),
]);
const buttons: Record<string, string> = {
  back: "Zurück zur vorherigen Frage / zum vorherigen Schritt",
  "finale-open": "Ab die Post, Wunschzettel! / Nachschlag",
  "visit-change": "Besuchswunsch ändern",
  send: "Jetzt alles abschicken!",
};
const labels: Record<Interaction["kind"], string> = {
  screen_opened: "Seite angezeigt",
  option_activated: "Option angeklickt / aktiviert",
  answer_changed: "Antwort geändert",
  popup_opened: "Popup geöffnet",
  popup_closed: "Popup geschlossen",
  button_activated: "Button betätigt",
};
const inputLabels: Record<InputMethod, string> = {
  mouse: "Maus",
  touch: "Touch",
  pen: "Stift",
  keyboard: "Tastatur / assistive Bedienung",
  unknown: "Nicht bestimmbar",
};
function targetLabel(event: Interaction) {
  switch (event.kind) {
    case "screen_opened":
      return Object.hasOwn(screens, event.target)
        ? screens[event.target]
        : undefined;
    case "option_activated":
      return Object.hasOwn(options, event.target)
        ? options[event.target]
        : undefined;
    case "answer_changed":
      return event.target === "visit"
        ? visitQuestion
        : questions.find((question) => question.id === event.target)?.title;
    case "popup_opened":
    case "popup_closed":
      return Object.hasOwn(popups, event.target)
        ? popups[event.target]
        : undefined;
    case "button_activated":
      return Object.hasOwn(buttons, event.target)
        ? buttons[event.target]
        : undefined;
  }
}
export function isValidInteractionLog(value: unknown): value is InteractionLog {
  if (!value || typeof value !== "object") return false;
  const log = value as InteractionLog;
  return (
    Array.isArray(log.events) &&
    log.events.length <= MAX_INTERACTIONS &&
    Number.isSafeInteger(log.omitted) &&
    log.omitted >= 0 &&
    log.events.every((event) => {
      if (
        !event ||
        typeof event !== "object" ||
        typeof event.kind !== "string" ||
        !Object.hasOwn(labels, event.kind) ||
        typeof event.at !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.at) ||
        !Number.isFinite(Date.parse(event.at)) ||
        typeof event.target !== "string" ||
        !targetLabel(event) ||
        (event.input !== undefined &&
          (typeof event.input !== "string" ||
            !Object.hasOwn(inputLabels, event.input)))
      )
        return false;
      if (event.kind !== "answer_changed") return event.selected === undefined;
      const allowed =
        event.target === "visit"
          ? visitOptions
          : questions.find((q) => q.id === event.target)!.options;
      const maximum = event.target === "gift-style" ? 2 : 1;
      return (
        Array.isArray(event.selected) &&
        event.selected.length <= maximum &&
        new Set(event.selected).size === event.selected.length &&
        event.selected.every((id) =>
          allowed.some((option) => option.id === id),
        ) &&
        (event.selected.length < 2 || event.selected.includes("together"))
      );
    })
  );
}
export function selectedIds(answer: Answer): string[] {
  return Array.isArray(answer) ? answer : [answer];
}
export function inputMethod(
  event: { detail: number; nativeEvent: Event },
  pointer?: string,
): InputMethod {
  if (event.detail === 0) return "keyboard";
  const kind = pointer || (event.nativeEvent as PointerEvent).pointerType;
  return kind === "mouse" || kind === "touch" || kind === "pen"
    ? kind
    : "unknown";
}
export function readableInteractions(log: InteractionLog) {
  return log.events.map((event, index) => ({
    Nr: index + 1,
    "Zeit (Browser, UTC)": event.at,
    Aktion: labels[event.kind],
    Inhalt: targetLabel(event),
    ...(event.input ? { Bedienung: inputLabels[event.input] } : {}),
    ...(event.selected
      ? {
          "Antwort danach": event.selected.map((id) => {
            const choices =
              event.target === "visit"
                ? visitOptions
                : questions.find((q) => q.id === event.target)!.options;
            return choices.find((option) => option.id === id)!.label;
          }),
        }
      : {}),
  }));
}
export function interactionSummary(log: InteractionLog) {
  const rows = readableInteractions(log).map(
    (event) =>
      `${event.Nr}. ${event["Zeit (Browser, UTC)"]} | ${event.Aktion}${event.Bedienung ? ` (${event.Bedienung})` : ""}\n${event.Inhalt}${event["Antwort danach"] ? `\nAntwort danach: ${event["Antwort danach"].join(" + ") || "Keine Auswahl"}` : ""}`,
  );
  return [
    "Vom Browser gemeldeter Verlauf. Angezeigt bedeutet nicht nachweislich gelesen.",
    ...rows,
    ...(log.omitted
      ? [
          `${log.omitted} weitere Ereignisse wurden wegen der Größenbegrenzung nicht aufgezeichnet.`,
        ]
      : []),
  ].join("\n\n");
}
