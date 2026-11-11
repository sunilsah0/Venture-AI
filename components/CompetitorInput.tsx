"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type C = { id: string; name: string; url: string | null };

export default function CompetitorInput({ projectId }: { projectId: string }) {
  const [list, setList] = useState<C[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [reviews, setReviews] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("competitors").select("id,name,url").eq("project_id", projectId);
    setList(data || []);
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) return;
    await supabase.from("competitors").insert({ project_id: projectId, name, url: url || null, pasted_reviews: reviews });
    setName(""); setUrl(""); setReviews("");
    load();
  }
  async function remove(id: string) {
    await supabase.from("competitors").delete().eq("id", id);
    load();
  }

  return (
    <div className="border rounded p-3 space-y-2">
      <p className="text-sm font-semibold">Add a competitor</p>
      <div className="flex gap-2 flex-wrap">
        <input className="border rounded p-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="border rounded p-2 flex-1 min-w-60" placeholder="Pricing/features page URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
      </div>
      <textarea className="border rounded p-2 w-full" rows={4} placeholder="Paste reviews of this competitor (blank line between each)" value={reviews} onChange={e => setReviews(e.target.value)} />
      <button onClick={add} className="bg-black text-white rounded px-3 py-1">Add</button>
      <ul className="text-sm">
        {list.map(c => (
          <li key={c.id}>{c.name} {c.url && <span className="text-gray-500">({c.url})</span>}{" "}
            <button onClick={() => remove(c.id)} className="text-red-600">remove</button></li>
        ))}
      </ul>
    </div>
  );
}