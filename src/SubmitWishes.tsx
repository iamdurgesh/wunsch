import { useRef, useState } from 'react';
import { CheckCheck, Send } from 'lucide-react';
import { buildSummary, questionnaireVersion, type Answers } from './questions';

type Props = { answers: Answers; note: string; invite: string; sentSummary: string; onSent: (summary: string) => void };
const retryMessage = 'Das Senden hat nicht geklappt. Ihre Antworten sind noch da. Bitte versuchen Sie es gleich noch einmal.';

export function SubmitWishes({ answers, note, invite, sentSummary, onSent }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const summary = buildSummary(answers, note);
  const sent = sentSummary === summary;

  async function submit() {
    if (inFlight.current || sent) return;
    inFlight.current = true;
    setSending(true); setError('');
    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Invite-Token': invite },
        body: JSON.stringify({ answers, note, version: questionnaireVersion }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true) {
        throw new Error(response.status === 401
          ? 'Dieser Einladungslink ist nicht mehr gültig. Bitte fragen Sie nach einem neuen Link.'
          : retryMessage);
      }
      onSent(summary);
    } catch (reason) {
      setError(reason instanceof Error && reason.message.startsWith('Dieser') ? reason.message : retryMessage);
    } finally { inFlight.current = false; setSending(false); }
  }

  return <div className="submission-area">
    {invite ? <>
      <p className="submission-explanation">Mit „Wünsche senden“ teilen Sie Ihre Antworten und Ihren Herzenswunsch mit der Person, die Ihnen diese Seite geschickt hat. Sie werden dafür gespeichert.</p>
      <button className="primary-button" onClick={submit} disabled={sending || sent} aria-busy={sending}>
        {sent ? <CheckCheck size={18} /> : <Send size={18} />}
        {sending ? 'Wünsche werden gesendet …' : sent ? 'Wünsche sind angekommen' : sentSummary ? 'Änderungen senden' : 'Wünsche senden'}
      </button>
      <p className="submission-status" role="status">{sent ? 'Gespeichert! Jetzt darf die Vorfreude übernehmen.' : sentSummary ? 'Ihre Änderungen werden erst beim erneuten Senden geteilt.' : ''}</p>
      {error && <p className="submission-error" role="alert">{error}</p>}
    </> : <p className="submission-explanation">Zum Senden öffnen Sie bitte Ihren persönlichen Einladungslink. Falls Sie keinen haben, fragen Sie die Person, die Ihnen diese Seite geschickt hat.</p>}
  </div>;
}
