import {
  visitFinalMessage,
  visitOptions,
  visitQuestion,
  type VisitChoice,
} from "./visit-plan";
import {
  answerIncludes,
  buildSummary,
  questions,
  type Answers,
} from "./questions";

const popupCatalog = questions.flatMap((question) =>
  [
    ...(question.reactions ?? []),
    ...(question.reaction ? [question.reaction] : []),
  ].map((reaction) => ({
    id: `${question.id}:${reaction.optionId}`,
    questionId: question.id,
    option: question.options.find((option) => option.id === reaction.optionId)!
      .label,
    reaction,
  })),
);

export function isValidShownPopups(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= popupCatalog.length &&
    new Set(value).size === value.length &&
    value.every((id) => popupCatalog.some((popup) => popup.id === id))
  );
}

// Null means an older client did not record displays; an empty list means none were shown.
export function readableAnswers(
  answers: Answers,
  shownPopups?: string[],
  visitChoice?: VisitChoice,
) {
  const rows = questions.map((question) => ({
    Frage: question.title,
    Antworten: question.options
      .filter((option) => answerIncludes(answers[question.id], option.id))
      .map((option) => option.label),
    "Angezeigte Popups":
      shownPopups === undefined
        ? null
        : popupCatalog
            .filter(
              (popup) =>
                popup.questionId === question.id &&
                shownPopups.includes(popup.id),
            )
            .map(({ option, reaction }) => ({
              "Ausgelöst durch": option,
              Nachricht: `${reaction.emoji} ${reaction.headline}`,
              Zusatztext: reaction.caption,
            })),
  }));
  if (visitChoice) {
    const option = visitOptions.find((option) => option.id === visitChoice)!;
    const message = visitFinalMessage(visitChoice);
    rows.push({
      Frage: visitQuestion,
      Antworten: [option.label],
      "Angezeigte Popups": [
        {
          "Ausgelöst durch": "Ab die Post, Wunschzettel!",
          Nachricht: "🥳 Juhuuu!",
          Zusatztext: visitQuestion,
        },
        {
          "Ausgelöst durch": option.label,
          Nachricht: `${message.emoji} ${message.headline}`,
          Zusatztext: message.caption,
        },
      ],
    });
  }
  return rows;
}

export function buildSubmissionSummary(
  answers: Answers,
  note: string,
  shownPopups?: string[],
  visitChoice?: VisitChoice,
) {
  const displays = readableAnswers(answers, shownPopups, visitChoice).flatMap(
    (row) =>
      (row["Angezeigte Popups"] ?? []).map(
        (popup) =>
          `${row.Frage}\nAusgelöst durch: ${popup["Ausgelöst durch"]}\n${popup.Nachricht}\n${popup.Zusatztext}`,
      ),
  );
  const status =
    shownPopups === undefined
      ? "Nicht erfasst (ältere Version)."
      : displays.length
        ? displays.join("\n\n")
        : "Keine Popups angezeigt.";
  const visit = visitChoice
    ? `\n\n${visitQuestion}\n${visitOptions.find((option) => option.id === visitChoice)!.label}`
    : "";
  return `${buildSummary(answers, note)}${visit}\n\nAngezeigte Popups (vom Browser gemeldet, auch bei später geänderter Antwort):\n${status}`;
}
