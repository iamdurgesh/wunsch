import {
  inputMethod,
  type InputMethod,
  type InteractionLog,
  type RecordInteraction,
} from "./interactions";
import { VisitFinale } from "./VisitFinale";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { type VisitChoice } from "./visit-plan";
import { buildSubmissionSummary } from "./submission-details";
import { useRef, useState } from "react";
import { CheckCheck, Send } from "lucide-react";
import {
  isValidAnswers,
  questionnaireVersion,
  type Answers,
} from "./questions";

type Props = {
  answers: Answers;
  onInteraction?: RecordInteraction;
  getInteractionLog?: () => InteractionLog;
  shownPopups?: string[];
  note: string;
  initialVisitChoice?: VisitChoice;
  onVisitChoice?: (choice: VisitChoice) => void;
  sentSummary: string;
  onSent: (summary: string) => void;
};
const retryMessage =
  "Das Senden hat nicht geklappt. Ihre Antworten sind noch da. Bitte versuchen Sie es gleich noch einmal.";

export function SubmitWishes({
  answers,
  note,
  sentSummary,
  onSent,
  shownPopups,
  initialVisitChoice,
  onVisitChoice,
  onInteraction,
  getInteractionLog,
}: Props) {
  const [visitChoice, setVisitChoice] = useState<VisitChoice | undefined>(
    initialVisitChoice,
  );
  const [savedVisitChoice, setSavedVisitChoice] = useState(initialVisitChoice);
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const submissionKey = useRef("");
  const summary = buildSubmissionSummary(
    answers,
    note,
    shownPopups,
    savedVisitChoice,
  );
  const sent = sentSummary === summary;
  const complete = isValidAnswers(answers, true) && note.length <= 500;

  async function submit(input: InputMethod = "unknown", visitUpdate = false) {
    if (!complete || inFlight.current || (!visitUpdate && sent)) return;
    if (visitUpdate && !visitChoice) return;
    const submittedChoice = visitUpdate ? visitChoice : savedVisitChoice;
    onInteraction?.({ kind: "button_activated", target: "send", input });
    const interactionLog = getInteractionLog?.();
    inFlight.current = true;
    setSending(true);
    setError("");
    try {
      if (!submissionKey.current) {
        try {
          submissionKey.current =
            sessionStorage.getItem("inge-wishes-submission-key") ?? "";
        } catch {
          /* In-memory retries still work. */
        }
        if (!/^[a-f0-9]{64}$/.test(submissionKey.current)) {
          submissionKey.current = Array.from(
            crypto.getRandomValues(new Uint8Array(32)),
            (byte) => byte.toString(16).padStart(2, "0"),
          ).join("");
          try {
            sessionStorage.setItem(
              "inge-wishes-submission-key",
              submissionKey.current,
            );
          } catch {
            /* Keep the key in memory. */
          }
        }
      }
      const response = await fetch("/api/wishes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Submission-Key": submissionKey.current,
        },
        body: JSON.stringify({
          answers,
          note,
          shownPopups,
          visitChoice: submittedChoice,
          interactionLog,
          version: questionnaireVersion,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true) {
        setError(
          response.status === 429
            ? "Die Wunschpost braucht eine kurze Verschnaufpause. Bitte versuchen Sie es in einer Minute noch einmal. Ihre Antworten sind noch da."
            : response.status === 503 && result?.code === "SCHEMA_OUTDATED"
              ? "Die Wunschpost ist noch nicht ganz startklar. Ihre Antworten bleiben hier. Bitte geben Sie mir kurz Bescheid."
              : retryMessage,
        );
        return;
      }
      setSavedVisitChoice(submittedChoice);
      if (submittedChoice) onVisitChoice?.(submittedChoice);
      onSent(
        buildSubmissionSummary(answers, note, shownPopups, submittedChoice),
      );
      setFinaleOpen(!visitUpdate);
    } catch {
      setError(retryMessage);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="submission-area">
      <button
        className="primary-button"
        onClick={(event) => {
          void submit(inputMethod(event));
        }}
        disabled={!complete || sending || sent}
        aria-busy={sending}
      >
        {sent ? <CheckCheck size={18} /> : <Send size={18} />}
        {sending
          ? "Die Wunschpost ist unterwegs …"
          : sent
            ? "Wünsche sind angekommen"
            : sentSummary
              ? "Nachschlag für die Geschenkabteilung!"
              : "Ab die Post, Wunschzettel!"}
      </button>
      {sent && !finaleOpen && <SubmissionSuccess />}
      <p className="submission-status" role="status">
        {!sent && sentSummary
          ? "Ihre Änderungen werden erst beim erneuten Senden geteilt."
          : ""}
      </p>
      {sent && !finaleOpen && (
        <button
          className="visit-back"
          onClick={() => {
            onInteraction?.({
              kind: "button_activated",
              target: "finale-open",
            });
            setFinaleOpen(true);
          }}
        >
          Optionale Einladung ansehen
        </button>
      )}
      {finaleOpen && (
        <VisitFinale
          onInteraction={onInteraction}
          choice={visitChoice}
          onChoose={(choice) => {
            setVisitChoice(choice);
          }}
          onClose={() => {
            setFinaleOpen(false);
            setVisitChoice(savedVisitChoice);
            setError("");
          }}
          onSend={(input) => submit(input, true)}
          sending={sending}
          error={error}
        />
      )}
      {!finaleOpen && error && (
        <p className="submission-error" role="alert">
          {error}
        </p>
      )}
      {!complete && (
        <p className="submission-explanation">
          Bitte beantworten Sie zuerst alle Fragen. Ihr Herzenswunsch als
          Freitext ist freiwillig.
        </p>
      )}
    </div>
  );
}
