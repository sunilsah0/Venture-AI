"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewProject() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", idea: "", target_segment: "", skills: "", budget: "", location: "", hours: "" });
  const [err, setErr] = useState("");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function create() {
    const { data, error } = await supabase.from("projects").insert({
      name: f.name, idea: f.idea, target_segment: f.target_segment,
      founder_profile: { skills: f.skills, budget: f.budget, location: f.location, hours_per_week: f.hours },
    }).select("id").single();
    if (error) setErr(error.message);
    else router.push(`/project/${data.id}`);
  }

  const box = "border rounded p-2 w-full";
  return (
    <main className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">New project</h1>
      <input className={box} placeholder="Project name" value={f.name} onChange={set("name")} />
      <textarea className={box} rows={3} placeholder="Your idea in 2-3 sentences" value={f.idea} onChange={set("idea")} />
      <input className={box} placeholder="Who is the customer? (e.g. freelancers)" value={f.target_segment} onChange={set("target_segment")} />
      <h2 className="font-semibold pt-2">About you (used later for Founder Fit)</h2>
      <input className={box} placeholder="Your skills" value={f.skills} onChange={set("skills")} />
      <input className={box} placeholder="Budget (e.g. 500 EUR)" value={f.budget} onChange={set("budget")} />
      <input className={box} placeholder="Location" value={f.location} onChange={set("location")} />
      <input className={box} placeholder="Hours per week you can work" value={f.hours} onChange={set("hours")} />
      <button onClick={create} className="bg-black text-white rounded px-4 py-2">Create</button>
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </main>
  );
}