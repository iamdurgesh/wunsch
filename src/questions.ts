export type Option = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  swatch?: string;
};
export type Question = {
  id: string;
  category: string;
  title: string;
  description: string;
  options: readonly Option[];
  aside: { emoji: string; headline: string; caption: string };
  reaction?: {
    optionId: string;
    emoji: string;
    headline: string;
    caption: string;
  };
  // Optional local meme: put the image in public/memes/ and set its path here.
  meme?: { src: string; alt: string; caption: string };
};

// Add, remove, or reorder questions here. IDs must be unique and stable.
// Season reaction uses Herbst as a placeholder until the inviter confirms their favourite.
export const questions: readonly Question[] = [
  {
    id: "fitness",
    category: "Gesund & munter",
    title: "Wie geht’s Ihnen mit Bewegung & Fitness?",
    description:
      "Würden Sie gern mehr über Ihre tägliche Bewegung, Ihren Schlaf und Ihre Fitness erfahren?",
    options: [
      {
        id: "yes",
        emoji: "🚶",
        label: "Ja, das klingt spannend!",
        description: "Schritte zählen und Neues über mich erfahren.",
      },
      {
        id: "maybe",
        emoji: "🤔",
        label: "Vielleicht – wenn’s einfach ist.",
        description: "Bitte ohne Technikstudium.",
      },
      {
        id: "no",
        emoji: "🌿",
        label: "Lieber ganz ohne Zahlen.",
        description: "Ich höre einfach auf mein Bauchgefühl.",
      },
    ],
    aside: {
      emoji: "🐈",
      headline: "10.000 Schritte?",
      caption: "Ich dachte, Sie sagten 10.000 Snacks.",
    },
  },
  {
    id: "colour",
    category: "Ihre Lieblingsfarben",
    title: "Welche Farbe darf Sie jeden Tag begleiten?",
    description:
      "Grün – Nato-Oliv und Tannengrün –, Blau, Beige und Braun: Ihre Lieblingsfarben sind hier auf der Seite schon dabei. Aber wenn Sie sich für eine Farbe entscheiden müssten, die Sie täglich tragen: Welche wäre es?",
    options: [
      {
        id: "olive",
        emoji: "🟢",
        swatch: "#686b3d",
        label: "Nato-Oliv",
        description: "Unaufgeregt und natürlich.",
      },
      {
        id: "fir",
        emoji: "🌲",
        swatch: "#234c3b",
        label: "Tannengrün",
        description: "Ein sattes, tiefes Grün.",
      },
      {
        id: "blue",
        emoji: "🔵",
        swatch: "#3474b9",
        label: "Blau",
        description: "Klar, ruhig und immer passend.",
      },
      {
        id: "beige",
        emoji: "🤍",
        swatch: "#d8c4a1",
        label: "Beige",
        description: "Hell, warm und dezent.",
      },
      {
        id: "brown",
        emoji: "🤎",
        swatch: "#80563e",
        label: "Braun",
        description: "Erdig, gemütlich und zeitlos.",
      },
    ],
    aside: {
      emoji: "🎨",
      headline: "Ihre Farben? Schon eingezogen.",
      caption: "Jetzt suchen wir noch die Lieblingsfarbe für jeden Tag.",
    },
  },
  {
    id: "season",
    category: "Sonne oder Kuschelwetter",
    title: "Welche Jahreszeit mögen Sie am liebsten?",
    description:
      "Blüten, Sonnenstrahlen, bunte Blätter oder Schnee – bei welchem Wetter fühlen Sie sich so richtig wohl?",
    options: [
      {
        id: "spring",
        emoji: "🌷",
        label: "Frühling",
        description: "Alles blüht, und die Sonne schaut wieder öfter vorbei.",
      },
      {
        id: "summer",
        emoji: "☀️",
        label: "Sommer",
        description: "Warme Tage, lange Abende und ganz viel draußen sein.",
      },
      {
        id: "autumn",
        emoji: "🍂",
        label: "Herbst",
        description:
          "Bunte Blätter, frische Luft und eine gemütliche Tasse Tee.",
      },
      {
        id: "winter",
        emoji: "❄️",
        label: "Winter",
        description:
          "Kalte Nasen, warme Decken und vielleicht ein bisschen Schnee.",
      },
    ],
    reaction: {
      optionId: "autumn",
      emoji: "🍂",
      headline: "Gleichgesinnte!",
      caption:
        "Wir ticken da total gleich. Team bunte Blätter und warme Getränke! ☕",
    },
    aside: {
      emoji: "🧣",
      headline: "Eine Frage des Wohlfühlwetters.",
      caption:
        "Für jede Jahreszeit gibt’s gute Gründe. Und die passende Ausrede, drinnen zu bleiben.",
    },
  },
  {
    id: "little-joys",
    category: "Die kleinen Freuden",
    title: "Ein freier Nachmittag. Was darf’s sein?",
    description:
      "Alle Termine sind abgesagt. Heute steht nur eine Person auf dem Programm: Sie.",
    options: [
      {
        id: "relax",
        emoji: "🛁",
        label: "Einfach mal abschalten.",
        description: "Gemütlichkeit, Ruhe und ein bisschen Wellness.",
      },
      {
        id: "discover",
        emoji: "🌷",
        label: "Raus und etwas entdecken.",
        description: "Ein kleiner Ausflug, ein großer Tapetenwechsel.",
      },
      {
        id: "food",
        emoji: "🍰",
        label: "Etwas richtig Gutes genießen.",
        description: "Kaffee, Kuchen und die beste Gesellschaft.",
      },
    ],
    aside: {
      emoji: "🦥",
      headline: "Heute schon etwas vor?",
      caption: "Ja. Es mir gut gehen lassen.",
    },
  },
  {
    id: "gift-style",
    category: "Fast ausgepackt",
    title: "Und was macht ein Geschenk besonders?",
    description:
      "Die letzte kleine Spur auf dem Weg zum richtigen Geburtstagswunsch.",
    options: [
      {
        id: "useful",
        emoji: "🎁",
        label: "Wenn ich es oft benutzen kann.",
        description: "Ein schöner Begleiter für meinen Alltag.",
      },
      {
        id: "together",
        emoji: "🥂",
        label: "Wenn wir Zeit zusammen haben.",
        description: "Die schönsten Erinnerungen passen in keinen Karton.",
      },
      {
        id: "surprise",
        emoji: "✨",
        label: "Überraschen Sie mich!",
        description: "Ein bisschen weiß ich es selbst noch nicht.",
      },
    ],
    aside: {
      emoji: "🐣",
      headline: "Ich brauche wirklich nichts.",
      caption: "… aber auspacken würde ich schon.",
    },
  },
  {
    id: "cleaning",
    category: "Der liebe Haushalt",
    title: "Haben Sie manchmal genug vom Putzen?",
    description:
      "Kaum ist alles sauber, geht’s wieder von vorne los. Wie sieht das bei Ihnen aus?",
    options: [
      {
        id: "viktor",
        emoji: "🦸",
        label: "Nein, Viktor ist unser Putzheld!",
        description: "Er übernimmt die Rolle des Putzmanns. Sehr praktisch.",
      },
      {
        id: "sometimes",
        emoji: "🧽",
        label: "Eigentlich putze ich gern. Meistens.",
        description: "Aber manchmal darf der Staub auch bis morgen warten.",
      },
      {
        id: "fed-up",
        emoji: "😮‍💨",
        label: "Vom täglichen Putzen habe ich genug.",
        description: "Ich hätte lieber mehr Zeit für die schönen Dinge.",
      },
    ],
    aside: {
      emoji: "🧹",
      headline: "Gerade erst geputzt.",
      caption: "Die Wohnung: „Schön. Machen wir morgen nochmal.“",
    },
  },
];

export type Answers = Record<string, string>;

// Changes to IDs or available choices invalidate old drafts and submissions.
export const questionnaireVersion = JSON.stringify(
  questions.map(({ id, options }) => [id, options.map((option) => option.id)]),
);

export function isValidAnswers(
  value: unknown,
  complete = false,
): value is Answers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    (!complete || entries.length === questions.length) &&
    entries.every(([id, answer]) =>
      questions.some(
        (question) =>
          question.id === id &&
          question.options.some((option) => option.id === answer),
      ),
    )
  );
}

export function getAnswerRows(answers: Answers) {
  return questions.map((question) => ({
    question,
    option: question.options.find(
      (option) => option.id === answers[question.id],
    ),
  }));
}

export function buildSummary(answers: Answers, note: string): string {
  const lines = getAnswerRows(answers).map(
    ({ question, option }) =>
      `${question.title}\n${option?.label ?? "Noch offen"}`,
  );
  return [
    "Frau Inges Geburtstagswünsche 🎁",
    ...lines,
    ...(note.trim() ? [`Mein Wunsch: ${note.trim()}`] : []),
  ].join("\n\n");
}
