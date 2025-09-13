"use client";

import { useState } from "react";
import { IsinForm } from "./components/IsinForm";
import { ResultCard } from "./components/ResultCard";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (isin: string) => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/isin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 gap-6">
      <h1 className="text-2xl font-semibold">Investor Pal</h1>
      <IsinForm onSubmit={handleSubmit} loading={loading} />
      {error && (
        <div className="text-red-600 text-sm border border-red-300 bg-red-50 rounded p-3 w-full max-w-xl">
          {error}
        </div>
      )}
      {result && <ResultCard data={result} />}
    </div>
  );
}
