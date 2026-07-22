"use client";

export const dynamic = 'force-dynamic';

import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('@/components/Scanner'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h2>Loading Pill Recognition System...</h2>
    </div>
  ),
});

export default function Page() {
  return <Scanner />;
}

import { useState } from "react";
import Nav from "@/components/Nav";
import Scanner from "@/components/Scanner";
import Scheduler from "@/components/Scheduler";
import SafetyReport from "@/components/SafetyReport";
import QRPassport from "@/components/QRPassport";
import { useMasterToken } from "@/lib/masterToken";

type Tab = "scan" | "schedule" | "safety" | "passport" | "export";

export default function Home() {
  const [tab, setTab] = useState<Tab>("scan");
  const [sessionStarted, setSessionStarted] = useState(false);
  const { token, pillCount, copyToken, resetToken, addIdentification } = useMasterToken();
  const [tokenCopied, setTokenCopied] = useState(false);
  const showMainScreen = sessionStarted || !!token;

  const handleCopyToken = async () => {
    await copyToken();
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setTab("scan");
  };

  const handleResetSession = () => {
    resetToken();
    setSessionStarted(false);
    setTab("scan");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Med Recognition Study</h1>
              <p className="text-sm text-slate-500 mt-1">Clinical validation of AI-assisted pill identification</p>
            </div>
            {/* Master token is intentionally shown only in the Export tab. */}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {!showMainScreen && (
          <div className="mb-6 bg-white border-2 border-blue-300 rounded-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Start Your Session</h2>
            <p className="text-sm text-slate-600 mb-4">
              Scan pills to begin. A master token will track all identifications, confidences, and latencies.
            </p>
            <button
              onClick={handleStartSession}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Begin Scanning
            </button>
          </div>
        )}

        {showMainScreen && (
          <>
            <Nav tab={tab} setTab={setTab} />

            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              {tab === "scan" && <Scanner onIdentify={addIdentification} />}
              {tab === "schedule" && <Scheduler />}
              {tab === "safety" && <SafetyReport />}
              {tab === "passport" && <QRPassport />}
              {tab === "export" && (
                <ExportTab token={token} pillCount={pillCount} onReset={handleResetSession} />
              )}
            </div>
          </>
        )}
      </div>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          This is a research tool for clinical validation. Results are experimental and{" "}
          <strong>NOT for medical use</strong>.
        </p>
      </footer>
    </main>
  );
}

function ExportTab({
  token,
  pillCount,
  onReset,
}: {
  token: string;
  pillCount: number;
  onReset: () => void;
}) {
  const [tokenCopied, setTokenCopied] = useState(false);

  const copyToken = async () => {
    await navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-2">✓ Session Complete</h3>
        <p className="text-sm text-green-800 mb-4">
          {pillCount} pill{pillCount !== 1 ? "s" : ""} identified. Complete the survey below with your master token.
        </p>

        <div className="bg-white border border-green-300 rounded p-3 mb-4">
          <p className="text-xs font-bold text-green-900 mb-2">Your Master Token</p>
          <p className="text-xs font-mono text-green-700 break-all mb-3">{token}</p>
          <button
            onClick={copyToken}
            className={`w-full px-3 py-2 rounded text-xs font-bold transition ${
              tokenCopied
                ? "bg-green-500 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {tokenCopied ? "✓ Copied to Clipboard" : "📋 Copy Token"}
          </button>
          <p className="text-xs text-green-600 mt-2">
            Paste this token at the start of your survey response.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="https://forms.gle/seniors-survey"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-3xl mb-2">👴</div>
          <h4 className="font-semibold text-orange-900 mb-2">Senior Usability Survey</h4>
          <p className="text-sm text-orange-700 mb-4">
            For participants 65+. Share your experience with the interface.
          </p>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium text-sm">
            Take Survey →
          </button>
        </a>

        <a
          href="https://forms.gle/physician-survey"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 hover:shadow-lg transition text-center"
        >
          <div className="text-3xl mb-2">👨‍⚕️</div>
          <h4 className="font-semibold text-blue-900 mb-2">Physician Clinical Audit Survey</h4>
          <p className="text-sm text-blue-700 mb-4">
            For medical professionals. Evaluate accuracy, trust, and safety features.
          </p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm">
            Take Survey →
          </button>
        </a>
      </div>

      <button
        onClick={onReset}
        className="w-full px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition"
      >
        Start New Session
      </button>
    </div>
  );
}
