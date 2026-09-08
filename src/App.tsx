import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCheck, Gift, Heart, LockKeyhole, RotateCcw, Sparkles } from 'lucide-react';
import { getAnswerRows, questions, type Answers } from './questions';
import { readDraft, readInvite, rememberInvite, saveDraft } from './draft';
import { SubmitWishes } from './SubmitWishes';
import { Confetti } from './Confetti';

function GiftArt({ small = false }: { small?: boolean }) {
  return <div className={`gift-scene ${small ? 'gift-scene-small' : ''}`} aria-hidden="true">
    <span className="art-star star-one">✳</span><span className="art-star star-two">✧</span>
    <span className="art-dot dot-one" /><span className="art-dot dot-two" />
    <div className="orbit orbit-one" /><div className="orbit orbit-two" />
    <div className="gift-illustration"><div className="bow bow-left" /><div className="bow bow-right" />
      <div className="gift-box" /><div className="gift-lid" /><div className="gift-ribbon" />
      <div className="gift-tag">Für Sie <Heart size={15} /></div>
    </div>
    <div className="gift-shadow" />
  </div>;
}

function App() {
  const [draft] = useState(readDraft);
  const [step, setStep] = useState(draft.step);
  const [answers, setAnswers] = useState<Answers>(draft.answers);
  const [note, setNote] = useState(draft.note);
  const [sentSummary, setSentSummary] = useState(draft.sentSummary);
  const [invite] = useState(readInvite);
  const [draftSaved, setDraftSaved] = useState(true);
  const [celebration, setCelebration] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);
  const lastStep = questions.length + 2;
  const questionIndex = step - 2;
  const question = questions[questionIndex];
  const isQuestion = step >= 2 && step < lastStep;
  const isDone = step === lastStep;
  const progress = Math.round((step / lastStep) * 100);

  useEffect(() => { rememberInvite(invite); }, [invite]);
  useEffect(() => {
    setDraftSaved(saveDraft({ step, answers, note, sentSummary }));
  }, [step, answers, note, sentSummary]);

  useEffect(() => {
    if (hasNavigated.current) {
      titleRef.current?.focus({ preventScroll: true });
      titleRef.current?.closest('.birthday-card')?.scrollIntoView?.({ block: 'start' });
    }
    hasNavigated.current = true;
  }, [step]);

  function restart() {
    if (!window.confirm('Möchten Sie neu anfangen? Ihr Entwurf in diesem Tab wird gelöscht. Bereits gesendete Wünsche bleiben beim Empfänger gespeichert.')) return;
    setAnswers({}); setNote(''); setSentSummary(''); setStep(0);
  }

  function nextQuestion() {
    if (step === lastStep - 1) setCelebration((previous) => previous + 1);
    setStep(step + 1);
  }

  return <div className="app-shell">
    {isDone && celebration > 0 && <Confetti key={celebration} />}
    <header className="site-header">
      <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setStep(0); }} aria-label="Für Frau Inge – zur Begrüßung">
        <span className="brand-icon"><Gift size={22} strokeWidth={1.5} /></span>
        <span>Für Frau Inge<span className="brand-dot">.</span></span>
      </a>
      <span className="header-note"><span /> Mit Liebe ausgedacht</span>
    </header>

    <main id="main-content">
      <div className="journey" aria-label="Fortschritt">
        <span className={step < 2 ? 'journey-active' : 'journey-complete'}><span className="journey-number">{step >= 2 ? <Check size={12} /> : '01'}</span> Ein kleines Hallo</span>
        <span className="journey-line" />
        <span className={isQuestion ? 'journey-active' : isDone ? 'journey-complete' : ''}><span className="journey-number">{isDone ? <Check size={12} /> : '02'}</span> Ihre Wünsche</span>
        <span className="journey-line" />
        <span className={isDone ? 'journey-active' : ''}><span className="journey-number">03</span> Die Vorfreude</span>
      </div>

      <div className="card-stack">
        <div className={`birthday-card ${isDone ? 'summary-card' : ''} ${isQuestion ? 'question-card' : ''}`}>
          <div className="card-content" key={step}>
            {step === 0 && <>
              <section className="letter-panel">
                <div className="eyebrow"><span className="tiny-line" /> EINE KLEINE GEBURTSTAGSMISSION</div>
                <h1 ref={titleRef} tabIndex={-1}>Liebe<br />Frau <em>Inge,</em><span className="heading-spark">✳</span></h1>
                <p className="letter-lead">Ihr Geburtstag rückt näher.<br />Meine Geschenkidee? <span className="underlined">Noch in Arbeit.</span></p>
                <p className="body-copy">Wie schon im letzten Jahr bin ich auch dieses Jahr ein bisschen ideenlos. Aber dieses Mal habe ich einen Plan: Wir finden gemeinsam heraus, was Ihnen Freude macht.</p>
                <p className="letter-invitation">Ein paar Fragen. Ein bisschen Spaß.<br />Und am Ende vielleicht die perfekte Idee.</p>
                <button className="primary-button" onClick={() => setStep(1)}>Na dann, los geht’s <ArrowRight size={18} /></button>
                <div className="button-caption"><LockKeyhole size={12} /> Nur für Sie. Und Ihre Geburtstagswünsche.</div>
              </section>
              <aside className="art-panel">
                <div className="round-stamp">EIN KLEINES<span>Nur für Sie</span> BISSCHEN VORFREUDE</div>
                <GiftArt />
                <div className="handwritten">Was schenkt man jemandem,<br />der „eigentlich nichts“ braucht?</div>
                <span className="art-footnote">CHALLENGE ACCEPTED.</span>
              </aside>
            </>}

            {step === 1 && <>
              <section className="letter-panel ready-panel">
                <div className="eyebrow"><Sparkles size={14} /> BEVOR WIR LOSLEGEN</div>
                <h1 ref={titleRef} tabIndex={-1}>Bereit für ein<br />bisschen <em>Neugier?</em></h1>
                <p className="body-copy">{questions.length} kleine Fragen helfen mir auf die Sprünge. Es gibt keine falschen Antworten – nur gute Hinweise.</p>
                <div className="ready-facts"><span><Check size={17} /> Ganz entspannt, in Ihrem Tempo</span><span><Check size={17} /> Antworten jederzeit ändern</span><span><Check size={17} /> Zum Schluss Platz für Ihren eigenen Wunsch</span></div>
                <button className="primary-button" onClick={() => setStep(2)}>Ich bin bereit <ArrowRight size={18} /></button>
                <p className="button-caption">Kaffee in der Hand? Dann kann’s losgehen.</p>
              </section>
              <aside className="art-panel meme-panel"><div className="meme-label">ICH, BEIM GESCHENKEFINDEN</div><div className="meme-emoji" aria-hidden="true">🧐</div><h2>Dieses Jahr<br />habe ich einen Plan.</h2><p>Der Plan: Sie fragen.<br />Genial eigentlich.</p><span className="meme-sticker">100 % gut gemeint</span></aside>
            </>}

            {isQuestion && question && <>
              <section className="letter-panel question-panel">
                <div className="eyebrow">FRAGE {String(questionIndex + 1).padStart(2, '0')} <span className="eyebrow-divider">/</span> {question.category.toLocaleUpperCase('de-DE')}</div>
                <h1 className="question-title" ref={titleRef} tabIndex={-1}>{question.title}</h1>
                <p className="body-copy question-description">{question.description}</p>
                <fieldset className="answer-options"><legend className="sr-only">{question.title}</legend>
                  {question.options.map((option) => <label className={`answer-option ${answers[question.id] === option.id ? 'selected' : ''}`} key={option.id}>
                    <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option.id }))} />
                    <span className="option-emoji" aria-hidden="true">{option.emoji}</span><span className="option-copy"><strong>{option.label}</strong><span>{option.description}</span></span><span className="radio-indicator" aria-hidden="true">{answers[question.id] === option.id && <Check size={12} />}</span>
                  </label>)}
                </fieldset>
                <div className="question-actions"><button className="primary-button" disabled={!answers[question.id]} onClick={nextQuestion}>{questionIndex === questions.length - 1 ? 'Zu meinen Wünschen' : 'Nächste Frage'}<ArrowRight size={18} /></button></div>
              </section>
              <aside className="art-panel meme-panel">
                {question.meme ? <figure className="custom-meme"><img src={question.meme.src} alt={question.meme.alt} /><figcaption>{question.meme.caption}</figcaption></figure> : <><div className="meme-label">EIN KLEINER GEDANKE AM RANDE</div><div className="meme-emoji" aria-hidden="true">{question.aside.emoji}</div><h2>{question.aside.headline}</h2><p>{question.aside.caption}</p><span className="meme-sticker">Man wird ja wohl wünschen dürfen.</span></>}
              </aside>
            </>}

            {isDone && <>
              <section className="letter-panel result-panel">
                <div className="eyebrow"><CheckCheck size={16} /> MISSION: EIN GUTES STÜCK WEITER</div>
                <h1 ref={titleRef} tabIndex={-1}>Weniger Rätsel.<br /><em>Mehr Vorfreude.</em></h1>
                <p className="body-copy">Vielen Dank, Frau Inge! Mit diesen kleinen Hinweisen wird aus meiner Ideenlosigkeit langsam ein Plan.</p>
                <div className="answer-summary">{getAnswerRows(answers).map(({ question: answeredQuestion, option }, index) => <div className="summary-row" key={answeredQuestion.id}><span aria-hidden="true">{option?.emoji}</span><div><small>{answeredQuestion.category}</small><strong>{option?.label ?? 'Noch offen'}</strong></div><button className="text-button" onClick={() => setStep(index + 2)} aria-label={`${answeredQuestion.category}: Antwort ändern`}>Ändern</button></div>)}</div>
                <label className="note-label" htmlFor="wish-note">Oder gibt es schon einen Herzenswunsch? <span>(optional)</span></label>
                <textarea id="wish-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Was ich mir eigentlich wünsche …" rows={2} />
                <SubmitWishes answers={answers} note={note} invite={invite} sentSummary={sentSummary} onSent={setSentSummary} />
              </section>
              <aside className="art-panel result-art"><span className="result-confetti" aria-hidden="true">✦ · ✧ · ✦</span><GiftArt small /><div className="handwritten">Vorfreude ist schließlich<br />auch schon ein Geschenk.</div><span className="art-footnote">FORTSETZUNG FOLGT. MIT GESCHENKPAPIER.</span></aside>
            </>}
          </div>
          <div className="card-bottom"><span>{step === 0 ? 'DER ANFANG VON EINER GUTEN IDEE' : isDone ? 'DAS WAR’S SCHON. FAST WIE ZAUBEREI.' : 'KLEINE FRAGEN, GROSSE GESCHENKIDEEN'}</span><span>{String(step).padStart(2, '0')} <span className="counter-divider">/</span> {String(lastStep).padStart(2, '0')}</span></div>
          <div className="progress-track" role="progressbar" aria-label="Geburtstagsmission" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      {!draftSaved && <p className="draft-warning" role="status">Ihr Browser kann den Entwurf gerade nicht merken. Bitte lassen Sie diesen Tab bis zum Senden geöffnet.</p>}
      <div className="below-card"><button className="back-button" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}><ArrowLeft size={15} /> Zurück</button><span><Heart size={13} /> Kein gewöhnlicher Fragebogen. Für keine gewöhnliche Frau.</span>{isDone ? <button className="back-button" onClick={restart}><RotateCcw size={14} /> Neu starten</button> : <span className="below-spacer" />}</div>
    </main>

    <footer className="site-footer"><span>EINE KLEINE IDEE. VON HERZEN.</span><details className="privacy-details"><summary><LockKeyhole size={12} /> Was passiert mit meinen Antworten?</summary><p>Ihr Entwurf wird in diesem Browser-Tab zwischengespeichert, damit er beim Neuladen erhalten bleibt. Nach 24 Stunden ohne Nutzung wird er nicht wiederhergestellt. Erst mit „Wünsche senden“ speichern Sie Ihre Antworten und Ihren Freitext bei Cloudflare für die Person, die Sie eingeladen hat. Zum Löschen gesendeter Wünsche wenden Sie sich bitte an diese Person. Die App verwendet keine Analyse-Tools oder extern geladenen Schriften.</p></details><span>Mit einem kleinen bisschen Magie <Sparkles size={13} /></span></footer>
  </div>;
}

export default App;
