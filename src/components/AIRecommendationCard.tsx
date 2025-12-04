// src/components/AIRecommendationCard.tsx
"use client";

import React from "react";
import type { AiRecommendation } from "../../aiRecommendations";

interface Props {
  recommendation: AiRecommendation;
}

const AIRecommendationCard: React.FC<Props> = ({ recommendation }) => {
  const { emoji, personaName, headline, summary, bullets, footer } =
    recommendation;

  return (
    <section
      style={{
        marginTop: "12px",
        borderRadius: "16px",
        border: "1px solid rgba(148,163,184,0.4)",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 55%), #020617",
        padding: "12px 14px",
        fontSize: "13px",
        boxShadow: "0 18px 40px rgba(15,23,42,0.75)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "20px" }}>{emoji}</span>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            AI Vibe Check: <span>{personaName}</span>
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "#9ca3af",
            }}
          >
            Lightly silly. Dead serious about getting you debt-free.
          </p>
        </div>
      </div>

      <p
        style={{
          marginBottom: "6px",
          color: "#e5e7eb",
        }}
      >
        {headline}
      </p>

      <p
        style={{
          marginBottom: "6px",
          color: "#e5e7eb",
        }}
      >
        {summary}
      </p>

      <ul
        style={{
          margin: 0,
          marginBottom: "6px",
          paddingLeft: "18px",
          color: "#cbd5f5",
        }}
      >
        {bullets.map((item, idx) => (
          <li key={idx} style={{ marginBottom: "2px" }}>
            {item}
          </li>
        ))}
      </ul>

      <p
        style={{
          fontSize: "11px",
          color: "#9ca3af",
        }}
      >
        {footer}
      </p>
      <p
        style={{
          marginTop: "2px",
          fontSize: "10px",
          color: "#6b7280",
        }}
      >
        Not formal financial advice — just a friendly nudge from your digital
        debt buddy. No shame, only progress. 💚
      </p>
    </section>
  );
};

export default AIRecommendationCard;
