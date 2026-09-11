export const visitQuestion =
  "Möchten Sie mich übernächstes Wochenende in Siegen sehen?";
export const visitOptions = [
  {
    id: "yes",
    emoji: "😊",
    label: "Ja!",
    description: "Das wäre schön.",
  },
  {
    id: "later",
    emoji: "🗓️",
    label: "Ein anderes Wochenende passt mir besser.",
    description: "Diesmal passt es leider nicht – aber gern ein anderes Mal.",
  },
  {
    id: "open",
    emoji: "🌿",
    label: "Das lasse ich noch offen.",
    description: "Ich möchte mich gerade noch nicht festlegen.",
  },
] as const;
// Keep older drafts and their interaction history readable during rollout.
export const recordedVisitOptions = [
  ...visitOptions,
  {
    id: "big-yes",
    emoji: "🤩",
    label: "Jaaaa!",
    description: "Siegen, wir haben ein Wiedersehen!",
  },
] as const;
export type VisitChoice = (typeof recordedVisitOptions)[number]["id"];
export function isVisitChoice(value: unknown): value is VisitChoice {
  return recordedVisitOptions.some((option) => option.id === value);
}
export function visitFinalMessage(choice: VisitChoice) {
  return choice === "open"
    ? {
        emoji: "🌿",
        headline: "Ganz entspannt.",
        caption:
          "Keine Eile, kein fester Plan. Das lassen wir einfach offen. 😊",
      }
    : choice === "later"
      ? {
          emoji: "💛",
          headline: "Vorfreude kennt keinen Fahrplan.",
          caption:
            "Alles gut – der Kalender darf mitreden. 😊 Wir lassen den Termin einfach offen. Wenn es für Sie passt, können wir später noch einmal schauen.",
        }
      : {
          emoji: "🚆",
          headline: "Ich gebe mein Bestes!",
          caption:
            "Wenn die Deutsche Bahn mich nicht wieder enttäuscht … wie immer. 🙈 Ich bringe jedenfalls schon mal die Vorfreude mit!",
        };
}
