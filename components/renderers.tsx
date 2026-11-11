"use client";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";


/* eslint-disable @typescript-eslint/no-explicit-any */

export const AiBadge = () => (
  <span className="text-xs bg-amber-100 text-amber-800 rounded px-2 py-0.5">AI interpretation</span>
);

export function Battlecards({ data }: { data: any }) {
  const all = data.competitors.flatMap((c: any) => c.weaknesses.map((w: any) => ({ ...w, who: c.name })));
  const radar = [...all].sort((a: any, b: any) => b.score - a.score).slice(0, 6)
    .map((w: any) => ({ label: w.weakness.slice(0, 24), score: w.score }));
  return (
    <div className="space-y-4">
      {radar.length >= 3 && (
        <div className="border rounded p-3">
          <p className="font-semibold text-sm">Competitor Weakness Radar (bigger = bigger opening)</p>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <RadarChart data={radar}>
                <PolarGrid /><PolarAngleAxis dataKey="label" />
                <Radar dataKey="score" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {data.competitors.map((c: any, i: number) => (
        <div key={i} className="border rounded-lg p-4 space-y-1">
          <h3 className="font-semibold">{c.name}</h3>
          <p className="text-sm">Positioning: {c.positioning}</p>
          <p className="text-sm">Pricing: {c.pricing}</p>
          <p className="text-sm">Strengths: {c.strengths.join("; ") || "-"}</p>
          <p className="text-sm font-semibold pt-1">Weaknesses <span className="text-xs bg-amber-100 text-amber-800 rounded px-2">AI scores</span></p>
          {c.weaknesses.map((w: any, j: number) => (
            <div key={j} className="text-sm border-l-2 pl-2 my-1">
              {w.weakness}: opening score {w.score}/100
              {w.quote && <div className="text-gray-600">&quot;{w.quote}&quot; {w.verified ? "✓ found in source text" : "⚠ quote NOT found in source text"}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
export function Opportunities({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Analysed {data.source_count} sources.</p>
      {data.opportunities.map((o: any, i: number) => (
        <div key={i} className="border rounded-lg p-4 space-y-1">
          <AiBadge />
          <h3 className="font-semibold">{o.problem}</h3>
          <p className="text-sm">Segment: {o.segment} · Frequency: {o.frequency} · Urgency: {o.urgency}</p>
          <p className="text-sm">Alternatives: {o.alternatives.join(", ") || "none found"}</p>
          <p className="text-sm">Cheap test: {o.validation_test}</p>
          <div className="text-sm pt-1">
            <b>Real evidence:</b>
            {o.evidence.length === 0 && <p className="text-gray-500">No source backs this card. Treat it as a guess.</p>}
            {o.evidence.map((s: any) => (
              <blockquote key={s.id} className="border-l-2 pl-2 my-1 text-gray-600">
                &quot;{s.text.slice(0, 220)}&quot;{" "}
                {s.url ? <a className="text-blue-600 underline" href={s.url} target="_blank">source ({s.date})</a> : <span>(pasted)</span>}
              </blockquote>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PainTable({ data }: { data: any }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Sample size: {data.sample_size} sources. Evidence counts come from our code, not from the AI.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr><th className="p-2">Pain</th><th>Evidence</th><th>Frequency</th><th>Severity</th><th>How they cope</th><th>Confidence</th><th>Links</th></tr>
          </thead>
          <tbody>
            {data.pains.map((p: any, i: number) => (
              <tr key={i} className="border-t align-top">
                <td className="p-2">{p.pain}</td><td>{p.evidence_count}</td><td>{p.frequency}</td>
                <td>{p.severity}</td><td>{p.coping}</td><td>{p.confidence}</td>
                <td>{p.links.map((l: string, j: number) => <a key={j} href={l} target="_blank" className="text-blue-600 underline mr-1">{j + 1}</a>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">&quot;How they cope&quot; is the Pain-to-Price Bridge: customers who pay or hire someone have a problem worth solving; &quot;ignores&quot; means it&apos;s just an annoyance.</p>
    </div>
  );
}

export function Gaps({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {data.gaps.map((g: any, i: number) => (
        <div key={i} className="border rounded-lg p-4 space-y-1">
          <AiBadge />
          <h3 className="font-semibold">{g.gap}</h3>
          <p className="text-sm">Underserved: {g.underserved_group}</p>
          <p className="text-sm">Strategy: <b>{g.strategy}</b></p>
          <p className="text-sm">{g.why}</p>
          <div className="flex items-center gap-2 text-sm">
            Defensibility {g.defensibility_score}/100
            <div className="h-2 w-40 bg-gray-200 rounded"><div className="h-2 bg-black rounded" style={{ width: `${g.defensibility_score}%` }} /></div>
          </div>
          <ul className="list-disc pl-5 text-sm">{g.defensibility_reasons.map((r: string, j: number) => <li key={j}>{r}</li>)}</ul>
          {g.founder_advantage && <p className="text-sm">Your edge: {g.founder_advantage}</p>}
        </div>
      ))}
    </div>
  );
}

export function RedTeam({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="border border-red-300 bg-red-50 rounded-lg p-4">
        <AiBadge />
        <h3 className="font-semibold mt-1">The strongest case against your idea</h3>
        <p className="text-sm">{data.strongest_case_against}</p>
      </div>
      <div>
        <h3 className="font-semibold">Contradicting evidence</h3>
        {data.contradictions.length === 0 && <p className="text-sm text-gray-500">None found. That can also mean the search was too narrow.</p>}
        {data.contradictions.map((c: any, i: number) => (
          <div key={i} className="border rounded p-3 my-2 text-sm">
            <p><b>Challenges:</b> {c.challenged_assumption}</p>
            <p>{c.note}</p>
            {c.evidence.map((s: any) => (
              <blockquote key={s.id} className="border-l-2 pl-2 my-1 text-gray-600">
                &quot;{s.text.slice(0, 200)}&quot; {s.url && <a className="text-blue-600 underline" href={s.url} target="_blank">source</a>}
              </blockquote>
            ))}
          </div>
        ))}
      </div>
      <div className="text-sm">
        <h3 className="font-semibold">Top risks</h3>
        <ul className="list-disc pl-5">{data.top_risks.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
        <h3 className="font-semibold mt-2">What would change this view</h3>
        <ul className="list-disc pl-5">{data.would_change_my_mind.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
      </div>
    </div>
  );
}