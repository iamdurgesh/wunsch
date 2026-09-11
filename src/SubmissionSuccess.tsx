import { CircleCheck } from "lucide-react";

export function SubmissionSuccess() {
  return (
    <div className="submission-success" role="status">
      <CircleCheck size={36} aria-hidden="true" />
      <div>
        <strong>Juhuuu, erfolgreich abgeschickt!</strong>
        <p>Ihr Wunschzettel ist angekommen und gespeichert. Vielen Dank!</p>
      </div>
    </div>
  );
}
