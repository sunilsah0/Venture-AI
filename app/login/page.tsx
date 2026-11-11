"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function logIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else router.push("/dashboard");
  }
  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg("Account created. Now click Log in.");
  }

  return (
    <main className="max-w-sm mx-auto mt-24 p-6 space-y-3">
      <h1 className="text-2xl font-bold">VentureMind</h1>
      <input className="border rounded p-2 w-full" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="border rounded p-2 w-full" type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={logIn} className="bg-black text-white rounded px-4 py-2">Log in</button>
        <button onClick={signUp} className="border rounded px-4 py-2">Sign up</button>
      </div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </main>
  );
}