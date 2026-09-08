import type { Question } from "./questions";
import "./selection-reaction.css";

export function SelectionReaction({
  reaction,
  answer,
}: {
  reaction: Question["reaction"];
  answer?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <div
      className="selection-reaction-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {!dismissed && reaction && answer === reaction.optionId && (
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
            onClick={() => setDismissed(true)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
