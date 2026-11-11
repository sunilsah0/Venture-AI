"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Ledger from "@/components/Ledger";
import ModuleTab from "@/components/ModuleTab";
import PastedBox from "@/components/PastedBox";

import CompetitorInput from "@/components/CompetitorInput";
import { Opportunities, PainTable, Battlecards, Gaps,RedTeam } from "@/components/renderers";

const TABS: [string, string][] = [
  ["ledger", "Evidence Ledger"],["discover", "1 Discovery"],
  ["pain", "2 Pain points"], ["competitors", "3 Competitors"],
  ["gaps", "4 Market gaps"],["redteam", "5 Red Team"],
  // new tabs get added here in later steps
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState("ledger");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.from("projects").select("name").eq("id", id).single().then(({ data }) => {
      if (!data) router.push("/dashboard");
      else setName(data.name);
    });
  }, [id, router]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <Link href="/dashboard" className="text-sm underline">← Projects</Link>
      <h1 className="text-2xl font-bold">{name}</h1>
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-1 rounded ${tab === key ? "bg-black text-white" : "border"}`}>{label}</button>
        ))}
      </div>

      {tab === "ledger" && <Ledger projectId={id} />}
            {tab === "discover" && (
        <div className="space-y-4">
          <PastedBox projectId={id} />
          <ModuleTab projectId={id} module="discover" label="Find opportunities" render={d => <Opportunities data={d} />} />
        </div>
      )}
            {tab === "competitors" && (
        <div className="space-y-4">
          <CompetitorInput projectId={id} />
          <ModuleTab projectId={id} module="competitors" label="Build battlecards" render={d => <Battlecards data={d} />} />
        </div>
      )}
        {tab === "pain" && <ModuleTab projectId={id} module="pain" label="Rank pain points" render={d => <PainTable data={d} />} />}
        {tab === "gaps" && <ModuleTab projectId={id} module="gaps" label="Detect market gaps" render={d => <Gaps data={d} />} />}
        {tab === "redteam" && <ModuleTab projectId={id} module="redteam" label="Run Red Team" render={d => <RedTeam data={d} />} />}
      {/* new tab lines get added here in later steps */}
    </main>
  );
}