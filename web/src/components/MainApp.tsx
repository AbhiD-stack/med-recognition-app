"use client";

import React, { useState } from "react";
import Scanner from "@/components/Scanner";
// Add or adjust imports based on your component filenames
// If your components are inline or in separate files, import them accordingly.

type TabType = "scan" | "schedule" | "safety" | "passport" | "export";

export type PillEntry = {
  id: string;
  drug_name?: string;
  ndc?: string;
  score: number;
  timestamp: number;
  scheduleTime?: string;
  notes?: string;
};

interface MainAppProps {
  onResetSession: () => void;
}

export default function MainApp({ onResetSession }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<TabType>("scan");
  const [savedPills, setSavedPills] = useState<PillEntry[]>([]);

  const handleAddPill = (pill: Omit<PillEntry, "id" | "timestamp">) => {
    const newEntry: PillEntry = {
      ...pill,
      id: Math.random().toString(36.substring(2, 9)),
      timestamp: Date.now(),
    };
    setSavedPills((prev) => [newEntry, ...prev]);
  };

  return (
    <div className="flex-1 flex flex-col pb-24 bg-slate-950 text-white min-h-screen">
      {/* Top Header */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <span className="text-xl">💊</span>
          <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Geriatric Pill ID
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full font-medium">
            System Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full">
        {activeTab === "scan" && (
          <div className="flex flex-col flex-1">
            <Scanner onAddPill={handleAddPill} />
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold">Medication Schedule</h2>
            <p className="text-sm text-slate-400">
              Manage daily dosage times and prevent missed medications.
            </p>
            {savedPills.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                No pills scanned yet. Go to Scan to add medications.
              </div>
            ) : (
              <div className="space-y-3">
                {savedPills.map((pill) => (
                  <div key={pill.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-white">{pill.drug_name || "Unknown Pill"}</h3>
                      <p className="text-xs text-slate-400">NDC: {pill.ndc || "N/A"}</p>
                    </div>
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg border border-blue-500/20">
                      Saved
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "safety" && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold">Safety & Interaction Check</h2>
            <p className="text-sm text-slate-400">
              Review potential drug-drug interactions and Beers criteria warnings for geriatric care.
            </p>
            <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl">
              <h3 className="font-medium text-emerald-400 mb-1">Safety Status: Stable</h3>
              <p className="text-xs text-slate-300">No high-risk polypharmacy interactions flagged in current active items.</p>
            </div>
          </div>
        )}

        {activeTab === "passport" && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold">Medication Passport</h2>
            <p className="text-sm text-slate-400">
              Portable emergency summary profile for healthcare providers.
            </p>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center text-center">
              <div className="w-32 h-32 bg-white p-2 rounded-xl mb-4 flex items-center justify-center text-black font-bold text-xs">
                [QR PASSPORT CODE]
              </div>
              <p className="text-xs text-slate-400">Scan to load complete patient medication profile instantly.</p>
            </div>
          </div>
        )}

        {activeTab === "export" && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-semibold">Export & Session Data</h2>
            <p className="text-sm text-slate-400">
              Export clinical session logs and medication summaries.
            </p>
            <button
              onClick={() => alert("Session data exported successfully.")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              Export JSON Report
            </button>
          </div>
        )}
      </div>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex justify-around items-center shadow-2xl">
        <button
          onClick={() => setActiveTab("scan")}
          className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === "scan" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          <span className="text-lg">📷</span>
          <span className="text-[10px] font-medium mt-0.5">Scan</span>
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === "schedule" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          <span className="text-lg">⏰</span>
          <span className="text-[10px] font-medium mt-0.5">Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab("safety")}
          className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === "safety" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          <span className="text-lg">🛡️</span>
          <span className="text-[10px] font-medium mt-0.5">Safety</span>
        </button>

        <button
          onClick={() => setActiveTab("passport")}
          className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === "passport" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          <span className="text-lg">🪪</span>
          <span className="text-[10px] font-medium mt-0.5">Passport</span>
        </button>

        <button
          onClick={() => setActiveTab("export")}
          className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === "export" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          <span className="text-lg">📤</span>
          <span className="text-[10px] font-medium mt-0.5">Export</span>
        </button>
      </nav>
    </div>
  );
}