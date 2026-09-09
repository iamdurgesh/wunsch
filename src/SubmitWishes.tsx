import {
  inputMethod,
  type InputMethod,
  type InteractionLog,
  type RecordInteraction,
} from "./interactions";
import { VisitFinale } from "./VisitFinale";
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
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const submissionKey = useRef("");
  const summary = buildSubmissionSummary(
    answers,
    note,
    shownPopups,
    visitChoice,
  );
  const sent = sentSummary === summary;
  const complete = isValidAnswers(answers, true) && note.length <= 500;

  async function submit(input: InputMethod = "unknown") {
    if (!complete || !visitChoice || inFlight.current || sent) return;
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
          visitChoice,
          interactionLog,
          version: questionnaireVersion,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true) {
        throw new Error(retryMessage);
      }
      onSent(summary);
      setFinaleOpen(false);
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
          onInteraction?.({
            kind: "button_activated",
            target: "finale-open",
            input: inputMethod(event),
          });
          setError("");
          setFinaleOpen(true);
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
      <p className="submission-status" role="status">
        {sent
          ? "Gespeichert! Jetzt darf die Vorfreude übernehmen."
          : sentSummary
            ? "Ihre Änderungen werden erst beim erneuten Senden geteilt."
            : ""}
      </p>
      {finaleOpen && (
        <VisitFinale
          onInteraction={onInteraction}
          choice={visitChoice}
          onChoose={(choice) => {
            setVisitChoice(choice);
            onVisitChoice?.(choice);
          }}
          onClose={() => setFinaleOpen(false)}
          onSend={submit}
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
