import {
  isValidAnswers,
  questionnaireVersion,
  questions,
  type Answers,
} from "./questions";

export const DRAFT_KEY = "inge-wishes-draft-v1";
const INVITE_KEY = "inge-wishes-invite";
const MAX_AGE = 24 * 60 * 60 * 1000;

export type Draft = {
  answers: Answers;
  note: string;
  step: number;
  sentSummary: string;
};
export const emptyDraft = (): Draft => ({
  answers: {},
  note: "",
  step: 0,
  sentSummary: "",
});

export function readDraft(): Draft {
  try {
    const incomingInvite = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("invite");
    if (
      incomingInvite !== null &&
      incomingInvite !== sessionStorage.getItem(INVITE_KEY)
    )
      return emptyDraft();
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    const value = JSON.parse(raw);
    if (
      value.version !== questionnaireVersion ||
      !Number.isFinite(value.savedAt) ||
      Date.now() - value.savedAt > MAX_AGE ||
      !isValidAnswers(value.answers) ||
      typeof value.note !== "string" ||
      value.note.length > 500 ||
      typeof value.sentSummary !== "string" ||
      !Number.isInteger(value.step)
    )
      return emptyDraft();
    // Never restore beyond an unanswered question, even if storage was modified.
    const firstOpen = questions.findIndex(
      (question) => !value.answers[question.id]?.length,
    );
    const maxStep = firstOpen < 0 ? questions.length + 2 : firstOpen + 2;
    return {
      answers: value.answers,
      note: value.note,
      step: Math.max(0, Math.min(value.step, maxStep)),
      sentSummary: value.sentSummary,
    };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(draft: Draft): boolean {
  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...draft,
        version: questionnaireVersion,
        savedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readInvite(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1)).get(
    "invite",
  );
  // A new invitation takes precedence over a previous session.
  if (fragment !== null) return /^[a-f0-9]{64}$/.test(fragment) ? fragment : "";
  try {
    return sessionStorage.getItem(INVITE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberInvite(invite: string) {
  try {
    sessionStorage.setItem(INVITE_KEY, invite);
  } catch {
    /* In-memory use still works. */
  }
  if (new URLSearchParams(window.location.hash.slice(1)).has("invite")) {
    // Keep the invitation out of browser history, screenshots and copied page URLs.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }
}
