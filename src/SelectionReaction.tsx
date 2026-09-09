import type { RecordInteraction } from "./interactions";
import { useDisplayEvent } from "./use-display-event";
import { useEffect, useState, type CSSProperties } from "react";
import { answerIncludes, type Answer, type Question } from "./questions";
import "./selection-reaction.css";

export function SelectionReaction({
  reaction,
  answer,
  onShown,
  interactionTarget,
  onInteraction,
}: {
  reaction: Question["reaction"];
  answer?: Answer;
  onShown?: () => void;
  interactionTarget?: string;
  onInteraction?: RecordInteraction;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [effectFinished, setEffectFinished] = useState(false);
  const active =
    !dismissed && reaction && answerIncludes(answer, reaction.optionId);

  useDisplayEvent(
    active ? interactionTarget : undefined,
    "popup_opened",
    onInteraction,
  );

  useEffect(() => {
    if (!active) return;
    const report = () => {
      if (document.visibilityState !== "hidden") onShown?.();
    };
    report();
    document.addEventListener("visibilitychange", report);
    return () => document.removeEventListener("visibilitychange", report);
  }, [active, onShown]);

  useEffect(() => {
    if (!active || !reaction.screenEmoji) return;
    const timeout = window.setTimeout(() => setEffectFinished(true), 4500);
    return () => window.clearTimeout(timeout);
  }, [active, reaction]);

  return (
    <>
      {active && reaction.screenEmoji && !effectFinished && (
        <div className="reaction-screen-effect" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <span
              key={index}
              style={
                {
                  "--column": index % 6,
                  "--row": Math.floor(index / 6),
                  "--delay": `${(index % 5) * 120}ms`,
                  "--tilt": `${index % 2 ? 16 : -16}deg`,
                } as CSSProperties
              }
            >
              {reaction.screenEmoji}
            </span>
          ))}
        </div>
      )}
      <div
        className={`selection-reaction-region${reaction?.large ? " reaction-large" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {active && (
          <div className="selection-reaction">
            <span className="reaction-emoji" aria-hidden="true">
              {reaction.emoji}
            </span>
            <div>
              <strong>{reaction.headline}</strong>
              <p>{reaction.caption}</p>
            </div>
            <button
              className="reaction-close"
              aria-label="Hinweis schließen"
              onClick={() => {
                if (interactionTarget)
                  onInteraction?.({
                    kind: "popup_closed",
                    target: interactionTarget,
                  });
                setDismissed(true);
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </>
  );
}
