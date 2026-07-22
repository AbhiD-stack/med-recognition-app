"use client";

import React from "react";
import MainApp from "@/components/MainApp";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <MainApp onResetSession={() => {}} />
    </main>
  );
}