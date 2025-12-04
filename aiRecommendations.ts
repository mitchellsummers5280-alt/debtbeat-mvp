// aiRecommendations.ts

export type AiRecStrategy = "warrior" | "rebel" | "wizard";

export interface AiRecommendation {
  emoji: string;
  personaName: string;
  headline: string;
  summary: string;
  bullets: string[];
  footer: string;
}

export function generateAiRecommendation(
  strategy: AiRecStrategy,
  debtsCount: number,
  monthsToPayoff?: number,
  interestTotal?: number
): AiRecommendation {
  const monthText = monthsToPayoff
    ? `around ${monthsToPayoff} months`
    : "a realistic amount of time";

  const interestText =
    typeof interestTotal === "number"
      ? `roughly $${interestTotal.toLocaleString()} in interest on this path.`
      : "a chunk of interest instead of letting it quietly snowball.";

  const baseBullets = [
    `You’re looking at ${monthText} to clear this plan.`,
    `You’ll pay ${interestText}`,
  ];

  if (strategy === "warrior") {
    return {
      emoji: "🛡️",
      personaName: "The Warrior",
      headline: "Charging into battle with quick-win energy.",
      summary:
        debtsCount <= 1
          ? "You’re facing one debt like it’s a final boss. Respect."
          : "We’re lining up your debts like bowling pins—then smashing them down one by one.",
      bullets: [
        "Small victories create big momentum (science says so, but also… vibes).",
        "Each payoff boosts confidence + frees up cash to hit the next debt harder.",
        ...baseBullets,
      ],
      footer:
        "You’re not your past spending—you’re the person who showed up today. That’s Warrior behavior.",
    };
  }

  if (strategy === "wizard") {
    return {
      emoji: "🧙‍♂️",
      personaName: "The Wizard",
      headline: "Casting spells to outsmart interest like a math sorcerer.",
      summary:
        "You’re eliminating high-APR debts first—very brainy, extremely optimized, borderline magical.",
      bullets: [
        "Every payment hits interest where it hurts (right in the APR).",
        "This path quietly saves future-you more money than it looks like at first glance.",
        ...baseBullets,
      ],
      footer:
        "Math may be cold, but Wizards are warm. You’re doing great—keep casting those responsible spells.",
    };
  }

  // rebel
  return {
    emoji: "🌀",
    personaName: "The Rebel",
    headline: "A flexible plan for humans, not robots.",
    summary:
      "You’re mixing motivation with smart interest savings—perfect for real-life people with real-life chaos.",
    bullets: [
      "You still get quick wins, but without ignoring high-APR troublemakers.",
      "This plan adapts when life does that thing where it changes every 6 minutes.",
      ...baseBullets,
    ],
    footer:
      "Zero shame allowed here. Debt is just a puzzle, and you’re solving it piece by piece.",
  };
}
