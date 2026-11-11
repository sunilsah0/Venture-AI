"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PastedBox({ projectId }: { projectId: string }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("projects").select("pasted_text").eq("id", projectId).single()
      .then(({ data }) => setText(data?.pasted_text || ""));
  }, [projectId]);

  async function save() {
    await supabase.from("projects").update({ pasted_text: text }).eq("id", projectId);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-2 border rounded p-3">
      <p className="text-sm font-semibold">Paste reviews, forum posts, complaints (separate each with a blank line)</p>
      <textarea className="border rounded p-2 w-full" rows={6} value={text} onChange={e => setText(e.target.value)} />
      <button onClick={save} className="border rounded px-3 py-1">Save</button>
      {saved && <span className="text-sm text-green-700 ml-2">Saved</span>}
    </div>
  );
}