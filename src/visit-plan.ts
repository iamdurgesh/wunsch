export const visitQuestion =
  "Möchten Sie mich übernächstes Wochenende in Siegen sehen?";
export const visitOptions = [
  { id: "yes", emoji: "😊", label: "Ja!", description: "Das wäre schön." },
  {
    id: "big-yes",
    emoji: "🤩",
    label: "Jaaaa!",
    description: "Siegen, wir haben ein Wiedersehen!",
  },
  {
    id: "later",
    emoji: "🗓️",
    label: "Ein anderes Wochenende passt mir besser.",
    description: "Ganz entspannt – wir finden einen passenden Termin.",
  },
] as const;
export type VisitChoice = (typeof visitOptions)[number]["id"];
export function isVisitChoice(value: unknown): value is VisitChoice {
  return visitOptions.some((option) => option.id === value);
}
export function visitFinalMessage(choice: VisitChoice) {
  return choice === "later"
    ? {
        emoji: "💛",
        headline: "Vorfreude kennt keinen Fahrplan.",
        caption:
          "Dann finden wir eine andere Woche, die gut passt. Freunde und Familie gehen natürlich vor – das Wiedersehen läuft uns nicht weg!",
      }
    : {
        emoji: "🚆",
        headline: "Ich gebe mein Bestes!",
        caption:
          "Wenn die Deutsche Bahn mich nicht wieder enttäuscht … wie immer. 🙈 Ich bringe jedenfalls schon mal die Vorfreude mit!",
      };
}
