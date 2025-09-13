"use client";

import { useState } from "react";

type Props = {
  onSubmit: (isin: string) => void;
  loading?: boolean;
};

export function IsinForm({ onSubmit, loading }: Props) {
  const [isin, setIsin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isin.trim()) return;
    onSubmit(isin.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl flex flex-col gap-3 border rounded p-4"
    >
      <label htmlFor="isin" className="text-sm font-medium">
        Enter ISIN
      </label>
      <input
        id="isin"
        name="isin"
        value={isin}
        onChange={(e) => setIsin(e.target.value.toUpperCase())}
        placeholder="e.g. IE00B4L5Y983"
        className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        pattern="[A-Z0-9]{12}"
        title="ISIN must be 12 alphanumeric characters"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !isin}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          {loading ? "Fetching…" : "Fetch & Save"}
        </button>
        <button
          type="button"
          onClick={() => setIsin("")}
          disabled={loading}
          className="px-4 py-2 rounded border text-sm"
        >
          Clear
        </button>
      </div>
    </form>
  );
}

