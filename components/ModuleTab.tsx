"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export default function ModuleTab({ projectId, module, label, render }: {
  projectId: string; module: string; label: string; render: (data: any) => ReactNode;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("outputs").select("data").eq("project_id", projectId).eq("module", module)
      .maybeSingle().then(({ data }) => setData(data?.data ?? null));
  }, [projectId, module]);

  async function run() {
    setLoading(true); setError("");
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify({ projectId, module }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error); else setData(json.data);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <button onClick={run} disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
        {loading ? "Working… (can take 20-40 s)" : label}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {data && render(data)}
    </div>
  );
}