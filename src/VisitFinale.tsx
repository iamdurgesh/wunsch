import {
  inputMethod,
  type InputMethod,
  type RecordInteraction,
} from "./interactions";
import { useDisplayEvent } from "./use-display-event";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { SubmissionSuccess } from "./SubmissionSuccess";
import {
  visitFinalMessage,
  visitOptions,
  recordedVisitOptions,
  visitQuestion,
  type VisitChoice,
} from "./visit-plan";
import "./visit-finale.css";

export function VisitFinale({
  choice,
  onChoose,
  onSend,
  onClose,
  sending,
  error,
  onInteraction,
}: {
  choice?: VisitChoice;
  onChoose: (choice: VisitChoice) => void;
  onSend: (input: InputMethod) => void;
  onClose: () => void;
  sending: boolean;
  error: string;
  onInteraction?: RecordInteraction;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerRef = useRef("unknown");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [confirm, setConfirm] = useState(false);
  const message = confirm && choice ? visitFinalMessage(choice) : undefined;

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => {
    headingRef.current?.focus();
  }, [confirm]);

  const popupTarget =
    confirm && choice ? `visit:${choice}` : "visit:invitation";
  useDisplayEvent(popupTarget, "popup_opened", onInteraction);
  const closePopup = () => {
    onInteraction?.({ kind: "popup_closed", target: popupTarget });
    onClose();
  };

  return (
    <dialog
      onPointerDownCapture={(event) => {
        pointerRef.current = event.pointerType;
      }}
      onKeyDownCapture={() => {
        pointerRef.current = "keyboard";
      }}
      ref={dialogRef}
      className="visit-finale"
      aria-labelledby="visit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!sending) closePopup();
      }}
    >
      <button
        className="visit-close"
        aria-label="Zurück zum Wunschzettel"
        disabled={sending}
        onClick={closePopup}
      >
        ×
      </button>
      <div className="visit-content" key={String(confirm)}>
        <SubmissionSuccess />
        <div className="visit-eyebrow">
          {message
            ? "DANKE FÜR IHRE ANTWORT"
            : "IHR WUNSCHZETTEL IST GESPEICHERT"}
        </div>
        <div className="visit-hero" aria-hidden="true">
          <span>✦</span>
          <span>{message?.emoji ?? "🥳"}</span>
          <span>✧</span>
        </div>
        <h2 id="visit-title" ref={headingRef} tabIndex={-1}>
          {message?.headline ?? "Juhuuu!"}
        </h2>
        {message ? (
          <>
            <p className="visit-copy">{message.caption}</p>
            <div className="visit-ticket">
              <span>IHRE ANTWORT</span>
              <strong>
                {
                  recordedVisitOptions.find((option) => option.id === choice)
                    ?.label
                }
              </strong>
              <small>
                Ihr Wunschzettel ist bereits gespeichert. Diese Antwort ist
                freiwillig.
              </small>
            </div>
            <button
              className="primary-button visit-send"
              onClick={(event) =>
                onSend(inputMethod(event, pointerRef.current))
              }
              disabled={sending}
              aria-busy={sending}
            >
              <Send size={20} />
              {sending
                ? "Die Wunschpost ist unterwegs …"
                : "Besuchsantwort senden"}
            </button>
            <button
              className="visit-back"
              disabled={sending}
              onClick={(event) => {
                onInteraction?.({
                  kind: "button_activated",
                  target: "visit-change",
                  input: inputMethod(event, pointerRef.current),
                });
                setConfirm(false);
              }}
            >
              Besuchswunsch ändern
            </button>
            {error && (
              <p className="submission-error" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="visit-copy">
              Ihre Wünsche sind angekommen! Wenn Sie mögen, gibt es noch eine
              kleine Einladung. Sie können sie auch einfach schließen.
            </p>
            <p className="visit-question">{visitQuestion}</p>
            <div className="visit-options">
              {visitOptions.map((option) => (
                <button
                  key={option.id}
                  className="visit-choice"
                  onClick={(event) => {
                    onInteraction?.({
                      kind: "option_activated",
                      target: `visit:${option.id}`,
                      input: inputMethod(event, pointerRef.current),
                    });
                    if (choice !== option.id)
                      onInteraction?.({
                        kind: "answer_changed",
                        target: "visit",
                        selected: [option.id],
                      });
                    onChoose(option.id);
                    setConfirm(true);
                  }}
                >
                  <span aria-hidden="true">{option.emoji}</span>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
            <button className="visit-back" onClick={closePopup}>
              Für heute fertig
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
