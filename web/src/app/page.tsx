"use client";

import React, { useState } from "react";
import MainApp from "@/components/MainApp";

export default function Page() {
  // Start directly on the main 5 tabs screen by setting sessionStarted to true
  const [sessionStarted, setSessionStarted] = useState(true);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {sessionStarted ? (
        <MainApp onResetSession={() => setSessionStarted(false)} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Geriatric Medication Safety & Pill ID</h1>
          <p className="text-slate-400 max-w-md mb-8">
            AI-powered pill recognition and polypharmacy management system.
          </p>
          <button
            onClick={() => setSessionStarted(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl transition shadow-lg shadow-blue-600/30"
          >
            Begin Scanning
          </button>
        </div>
      )}
    </main>
  );
}