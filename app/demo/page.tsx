"use client";

import React from "react";

export default function DemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#f9fafb",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "24px 16px 48px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            marginBottom: "12px",
          }}
        >
          Demo Screen
        </h1>

        <p
          style={{
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          This is a simple demo route so we can test the page transitions
          between Home and Demo.
        </p>
      </div>
    </main>
  );
}
