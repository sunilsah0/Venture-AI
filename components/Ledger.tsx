"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string; claim: string; kind: string; source_url: string | null;
  source_type: string | null; source_date: string | null;
  confidence: string | null; supports: boolean;
};

export default function Ledger({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [claim, setClaim] = useState("");
  const [kind, setKind] = useState("assumption");
  const [url, setUrl] = useState("");
  const [supports, setSupports] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("evidence").select("*")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setRows(data || []);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!claim.trim()) return;
    await supabase.from("evidence").insert({
      project_id: projectId, claim, kind, source_url: url || null,
      source_type: "manual", supports, confidence: "medium",
    });
    setClaim(""); setUrl("");
    load();
  }
  async function remove(id: string) {
    await supabase.from("evidence").delete().eq("id", id);
    load();
  }

  const color: Record<string, string> = {
    fact: "bg-green-100 text-green-800", inference: "bg-amber-100 text-amber-800", assumption: "bg-gray-200 text-gray-800",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Green = observed fact (has a source). Amber = AI inference. Grey = assumption (unproven).
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <input className="border rounded p-2 flex-1 min-w-60" placeholder="Claim" value={claim} onChange={e => setClaim(e.target.value)} />
        <select className="border rounded p-2" value={kind} onChange={e => setKind(e.target.value)}>
          <option>fact</option><option>inference</option><option>assumption</option>
        </select>
        <input className="border rounded p-2" placeholder="Source URL (optional)" value={url} onChange={e => setUrl(e.target.value)} />
        <label className="text-sm"><input type="checkbox" checked={supports} onChange={e => setSupports(e.target.checked)} /> supports idea</label>
        <button onClick={add} className="bg-black text-white rounded px-3 py-2">Add</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">Claim</th><th>Kind</th><th>Source</th><th>Date</th><th>Confidence</th><th>Effect</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 max-w-md">{r.claim}</td>
                <td><span className={`px-2 rounded ${color[r.kind] || ""}`}>{r.kind}</span></td>
                <td>{r.source_url ? <a className="text-blue-600 underline" href={r.source_url} target="_blank">{r.source_type}</a> : r.source_type}</td>
                <td>{r.source_date}</td>
                <td>{r.confidence}</td>
                <td>{r.supports ? "supports" : "contradicts"}</td>
                <td><button onClick={() => remove(r.id)} className="text-red-600">x</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}