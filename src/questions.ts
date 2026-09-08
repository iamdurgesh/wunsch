export type Option = { id: string; emoji: string; label: string; description: string };
export type Question = {
  id: string;
  category: string;
  title: string;
  description: string;
  options: readonly Option[];
  aside: { emoji: string; headline: string; caption: string };
  // Optional local meme: put the image in public/memes/ and set its path here.
  meme?: { src: string; alt: string; caption: string };
};

// Add, remove, or reorder questions here. IDs must be unique and stable.
// The questions after "fitness" are editable examples for the first version.
export const questions: readonly Question[] = [
  {
    id: 'fitness', category: 'Gesund & munter',
    title: 'Ein bisschen Fitness fürs Handgelenk?',
    description: 'Würden Sie gern Ihre Bewegung, Ihren Schlaf oder Ihre Fitness mit einer Uhr im Blick behalten?',
    options: [
      { id: 'yes', emoji: '⌚', label: 'Ja, das klingt spannend!', description: 'Schritte zählen und Neues über mich erfahren.' },
      { id: 'maybe', emoji: '🤔', label: 'Vielleicht – wenn’s einfach ist.', description: 'Bitte ohne Technikstudium.' },
      { id: 'no', emoji: '🌿', label: 'Lieber ganz ohne Zahlen.', description: 'Ich höre einfach auf mein Bauchgefühl.' },
    ],
    aside: { emoji: '🐈', headline: '10.000 Schritte?', caption: 'Ich dachte, Sie sagten 10.000 Snacks.' },
  },
  {
    id: 'little-joys', category: 'Die kleinen Freuden',
    title: 'Ein freier Nachmittag. Was darf’s sein?',
    description: 'Alle Termine sind abgesagt. Heute steht nur eine Person auf dem Programm: Sie.',
    options: [
      { id: 'relax', emoji: '🛁', label: 'Einfach mal abschalten.', description: 'Gemütlichkeit, Ruhe und ein bisschen Wellness.' },
      { id: 'discover', emoji: '🌷', label: 'Raus und etwas entdecken.', description: 'Ein kleiner Ausflug, ein großer Tapetenwechsel.' },
      { id: 'food', emoji: '🍰', label: 'Etwas richtig Gutes genießen.', description: 'Kaffee, Kuchen und die beste Gesellschaft.' },
    ],
    aside: { emoji: '🦥', headline: 'Heute schon etwas vor?', caption: 'Ja. Es mir gut gehen lassen.' },
  },
  {
    id: 'gift-style', category: 'Fast ausgepackt',
    title: 'Und was macht ein Geschenk besonders?',
    description: 'Die letzte kleine Spur auf dem Weg zum richtigen Geburtstagswunsch.',
    options: [
      { id: 'useful', emoji: '🎁', label: 'Wenn ich es oft benutzen kann.', description: 'Ein schöner Begleiter für meinen Alltag.' },
      { id: 'together', emoji: '🥂', label: 'Wenn wir Zeit zusammen haben.', description: 'Die schönsten Erinnerungen passen in keinen Karton.' },
      { id: 'surprise', emoji: '✨', label: 'Überraschen Sie mich!', description: 'Ein bisschen weiß ich es selbst noch nicht.' },
    ],
    aside: { emoji: '🐣', headline: 'Ich brauche wirklich nichts.', caption: '… aber auspacken würde ich schon.' },
  },
];

export type Answers = Record<string, string>;

// Changes to IDs or available choices invalidate old drafts and submissions.
export const questionnaireVersion = JSON.stringify(questions.map(({ id, options }) => [id, options.map((option) => option.id)]));

export function isValidAnswers(value: unknown, complete = false): value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (!complete || entries.length === questions.length) && entries.every(([id, answer]) =>
    questions.some((question) => question.id === id && question.options.some((option) => option.id === answer)),
  );
}

export function getAnswerRows(answers: Answers) {
  return questions.map((question) => ({
    question,
    option: question.options.find((option) => option.id === answers[question.id]),
  }));
}

export function buildSummary(answers: Answers, note: string): string {
  const lines = getAnswerRows(answers).map(({ question, option }) =>
    `${question.title}\n${option?.label ?? 'Noch offen'}`,
  );
  return ['Frau Inges Geburtstagswünsche 🎁', ...lines, ...(note.trim() ? [`Mein Wunsch: ${note.trim()}`] : [])].join('\n\n');
}
