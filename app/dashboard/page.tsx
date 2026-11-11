"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Project = { id: string; name: string; idea: string | null };

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      const res = await supabase.from("projects").select("id,name,idea").order("created_at", { ascending: false });
      setProjects(res.data || []);
    });
  }, [router]);

  async function logOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your projects</h1>
        <button onClick={logOut} className="text-sm underline">Log out</button>
      </div>
      <Link href="/project/new" className="inline-block bg-black text-white rounded px-4 py-2">+ New project</Link>
      <ul className="space-y-2">
        {projects.map(p => (
          <li key={p.id} className="border rounded p-3">
            <Link href={`/project/${p.id}`} className="font-semibold underline">{p.name}</Link>
            <p className="text-sm text-gray-600">{p.idea}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}