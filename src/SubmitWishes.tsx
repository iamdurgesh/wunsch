import { useRef, useState } from "react";
import { CheckCheck, Send } from "lucide-react";
import {
  buildSummary,
  isValidAnswers,
  questionnaireVersion,
  type Answers,
} from "./questions";

type Props = {
  answers: Answers;
  note: string;
  sentSummary: string;
  onSent: (summary: string) => void;
};
const retryMessage =
  "Das Senden hat nicht geklappt. Ihre Antworten sind noch da. Bitte versuchen Sie es gleich noch einmal.";

export function SubmitWishes({ answers, note, sentSummary, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const submissionKey = useRef("");
  const summary = buildSummary(answers, note);
  const sent = sentSummary === summary;
  const complete = isValidAnswers(answers, true) && note.length <= 500;

  async function submit() {
    if (!complete || inFlight.current || sent) return;
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
        body: JSON.stringify({ answers, note, version: questionnaireVersion }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true) {
        throw new Error(retryMessage);
      }
      onSent(summary);
    } catch {
      setError(retryMessage);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="submission-area">
      <p className="submission-explanation" id="submission-explanation">
        Erst wenn Sie diesen Knopf drücken, werden Ihre Antworten und Ihr
        Herzenswunsch gesendet und für die Person gespeichert, die Sie
        eingeladen hat. Bis dahin bleibt der Wunschzettel in diesem Browser-Tab.
        Die Geschenkabteilung wartet gespannt!
      </p>
      <button
        className="primary-button"
        onClick={submit}
        disabled={!complete || sending || sent}
        aria-busy={sending}
        aria-describedby="submission-explanation"
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
      {error && (
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
