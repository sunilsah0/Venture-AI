/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { askJSON } from "./llm";
import { searchHN, fetchPageText, numberSources, pastedItems, type Source } from "./sources";

const RULES = `You are a careful startup research analyst. Use ONLY the information given in the message. Never invent facts, quotes, numbers or links. If the information does not support something, say "not enough evidence". When sources have ids like S3, refer to them only by id.`;

const list = (s: Source[]) => s.map(x => `[${x.id}] (${x.type} ${x.date}) ${x.text}`).join("\n");

// keep only ids that really exist (the AI sometimes makes one up)
const validIds = (ids: string[], sources: Source[]) =>
  ids.map(i => i.replace(/[\[\]\s]/g, "")).filter(id => sources.some(s => s.id === id));

const factRow = (s: Source, supports = true) => ({
  claim: s.text, kind: "fact", source_url: s.url || null, source_type: s.type,
  source_date: s.date || null, confidence: "medium", supports,
});

// save to the Evidence Ledger, skipping claims that are already there
async function saveEvidence(db: SupabaseClient, projectId: string, rows: any[]) {
  const { data: old } = await db.from("evidence").select("claim").eq("project_id", projectId);
  const seen = new Set((old || []).map((r: any) => r.claim));
  const fresh = rows
    .filter(r => { if (seen.has(r.claim)) return false; seen.add(r.claim); return true; })
    .map(r => ({ project_id: projectId, ...r }));
  if (fresh.length) await db.from("evidence").insert(fresh);
}

const OppSchema = z.object({
  opportunities: z.array(z.object({
    problem: z.string(), segment: z.string(), frequency: z.string(), urgency: z.string(),
    alternatives: z.array(z.string()).default([]),
    validation_test: z.string(),
    source_ids: z.array(z.string()).default([]),
  })),
});
const PainSchema = z.object({
  pains: z.array(z.object({
    pain: z.string(), frequency: z.string(), severity: z.string(), coping: z.string(),
    source_ids: z.array(z.string()).default([]),
  })),
});

const CompSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(), positioning: z.string(), pricing: z.string(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.object({
      weakness: z.string(),
      frequency: z.coerce.number(), severity: z.coerce.number(), fix_likelihood: z.coerce.number(),
      quote: z.string().default(""),
    })).default([]),
  })),
});

const GapSchema = z.object({
  gaps: z.array(z.object({
    gap: z.string(), underserved_group: z.string(), strategy: z.string(), why: z.string(),
    defensibility_score: z.coerce.number(),
    defensibility_reasons: z.array(z.string()).default([]),
    founder_advantage: z.string().default(""),
  })),
});

const RedSchema = z.object({
  contradictions: z.array(z.object({
    challenged_assumption: z.string(), note: z.string(),
    source_ids: z.array(z.string()).default([]),
  })).default([]),
  strongest_case_against: z.string(),
  top_risks: z.array(z.string()).default([]),
  would_change_my_mind: z.array(z.string()).default([]),
});

export async function runModule(db: SupabaseClient, projectId: string, module: string) {
  const { data: project } = await db.from("projects").select("*").eq("id", projectId).single();
  if (!project) throw new Error("Project not found");
  const info = `IDEA: ${project.idea}\nTARGET CUSTOMER: ${project.target_segment}\nFOUNDER: ${JSON.stringify(project.founder_profile)}`;
  let data: any;

  // ---------- STEP 3: DISCOVERY ----------
  if (module === "discover") {
    const { keywords } = await askJSON(RULES,
      `${info}\n\nGive 4 short search phrases (2-4 words) that real people would type when complaining about the problem this idea solves. Return JSON: {"keywords":["..."]}`,
      z.object({ keywords: z.array(z.string()).min(1) }));

    const hn = (await Promise.all(keywords.slice(0, 4).map(k => searchHN(k, 8)))).flat();
    const sources = numberSources([...pastedItems(project.pasted_text), ...hn]);
    if (!sources.length) throw new Error("No sources found. Paste some reviews or forum posts into the box first.");

    const out = await askJSON(RULES,
      `${info}\n\nSOURCES:\n${list(sources)}\n\nFind repeated customer problems in the sources. Max 5 opportunity cards. Return JSON: {"opportunities":[{"problem":"","segment":"","frequency":"low|medium|high","urgency":"low|medium|high","alternatives":[""],"validation_test":"one cheap experiment","source_ids":["S1"]}]}`,
      OppSchema);

    // the AI only returned ids; WE attach the real quotes and links
    const opportunities = out.opportunities.map(o => {
      const ids = validIds(o.source_ids, sources);
      return { ...o, evidence: sources.filter(s => ids.includes(s.id)) };
    });

    await saveEvidence(db, projectId, [
      ...opportunities.flatMap(o => o.evidence.map(s => factRow(s))),
      ...opportunities.map(o => ({
        claim: o.problem, kind: "inference", source_type: "ai",
        confidence: o.evidence.length >= 3 ? "medium" : "low",
      })),
    ]);
    data = { opportunities, source_count: sources.length };
  }



  // ---------- STEP 4: PAIN RANKING ----------
  if (module === "pain") {
    const { data: ev } = await db.from("evidence").select("*")
      .eq("project_id", projectId).eq("kind", "fact").eq("supports", true);
    const { data: comps } = await db.from("competitors").select("*").eq("project_id", projectId);
    const sources = numberSources([
      ...(ev || []).map((e: any) => ({ url: e.source_url || "", date: e.source_date || "", type: e.source_type || "evidence", text: e.claim })),
      ...(comps || []).flatMap((c: any) => pastedItems(c.pasted_reviews).map(i => ({ ...i, type: `review of ${c.name}` }))),
    ]);
    if (!sources.length) throw new Error("Run Discovery first, or add competitor reviews.");

    const out = await askJSON(RULES,
      `${info}\n\nSOURCES:\n${list(sources)}\n\nRank what customers complain about. Max 8 rows. 'coping' = how they cope today. Return JSON: {"pains":[{"pain":"","frequency":"low|medium|high","severity":"low|medium|high","coping":"pays|workaround|hires someone|switches|ignores|unknown","source_ids":["S1"]}]}`,
      PainSchema);

    const pains = out.pains.map(p => {
      const ids = validIds(p.source_ids, sources);
      const n = ids.length;
      return {
        ...p, evidence_count: n,
        confidence: n >= 5 ? "high" : n >= 2 ? "medium" : "low",
        links: sources.filter(s => ids.includes(s.id)).map(s => s.url).filter(Boolean).slice(0, 3),
      };
    }).sort((a, b) => b.evidence_count - a.evidence_count);

    await saveEvidence(db, projectId, pains.map(p => ({
      claim: `Pain: ${p.pain} (${p.frequency} frequency, ${p.severity} severity)`,
      kind: "inference", source_type: "ai", confidence: p.confidence,
    })));
    data = { pains, sample_size: sources.length };
  }

  // ---------- STEP 5: COMPETITORS ----------
  if (module === "competitors") {
    const { data: comps } = await db.from("competitors").select("*").eq("project_id", projectId);
    if (!comps?.length) throw new Error("Add at least one competitor first.");

    for (const c of comps) {                       // read each public web page
      if (c.url) {
        const t = await fetchPageText(c.url);
        if (t) { await db.from("competitors").update({ page_text: t }).eq("id", c.id); c.page_text = t; }
      }
    }
    const block = comps.map((c: any) =>
      `### ${c.name}\nWEBSITE TEXT: ${c.page_text || "none"}\nREVIEWS: ${c.pasted_reviews || "none"}`).join("\n\n");

    const out = await askJSON(RULES,
      `${info}\n\nCOMPETITOR MATERIAL:\n${block}\n\nBuild a battlecard per competitor. Scores are 1-5. 'quote' must be copied EXACTLY (max 20 words) from the material above, or empty. Return JSON: {"competitors":[{"name":"","positioning":"","pricing":"what the text says, or not found","strengths":[""],"weaknesses":[{"weakness":"","frequency":1,"severity":1,"fix_likelihood":1,"quote":""}]}]}`,
      CompSchema);

    const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
    const hay = norm(block);
    const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n) || 1));
    const competitors = out.competitors.map(c => ({
      ...c,
      weaknesses: c.weaknesses.map(w => {
        const f = clamp(w.frequency), s = clamp(w.severity), fix = clamp(w.fix_likelihood);
        return {
          ...w, frequency: f, severity: s, fix_likelihood: fix,
          // how big is the opening? frequent + severe + unlikely to be fixed = big
          score: Math.round(((f + s + (6 - fix)) / 15) * 100),
          verified: !!w.quote && hay.includes(norm(w.quote)),   // quote really exists in the text?
        };
      }),
    }));

    await saveEvidence(db, projectId, competitors.flatMap(c => c.weaknesses.map(w => ({
      claim: `${c.name} weakness: ${w.weakness}`, kind: "inference",
      source_type: "competitor material", confidence: w.verified ? "medium" : "low",
    }))));
    data = { competitors };
  }

  // ---------- STEP 6: MARKET GAPS ----------
  if (module === "gaps") {
    const { data: outs } = await db.from("outputs").select("module,data")
      .eq("project_id", projectId).in("module", ["discover", "pain", "competitors"]);
    if (!outs?.length) throw new Error("Run Discovery, Pain points and Competitors first.");
    const prior = outs.map((o: any) => `## ${o.module}\n${JSON.stringify(o.data).slice(0, 6000)}`).join("\n\n");

    const out = await askJSON(RULES,
      `${info}\n\nEARLIER ANALYSES (made from real sources):\n${prior}\n\nFind underserved market gaps. Max 5. Pick one strategy per gap from: cheaper simpler alternative | specialized product | integration layer | premium niche | local version | service-enabled. Rate defensibility 0-100 (easy for incumbents to copy = low). Be honest: low scores are fine. Return JSON: {"gaps":[{"gap":"","underserved_group":"","strategy":"","why":"","defensibility_score":0,"defensibility_reasons":[""],"founder_advantage":"based only on the FOUNDER info"}]}`,
      GapSchema);

    const gaps = out.gaps.map(g => ({ ...g, defensibility_score: Math.max(0, Math.min(100, Math.round(g.defensibility_score))) }));
    await saveEvidence(db, projectId, gaps.map(g => ({
      claim: `Gap: ${g.gap} (strategy: ${g.strategy}, defensibility ${g.defensibility_score}/100)`,
      kind: "inference", source_type: "ai", confidence: "low",
    })));
    data = { gaps };
  }


  // ---------- STEP 7: RED TEAM ----------
  if (module === "redteam") {
    const { queries } = await askJSON(RULES,
      `${info}\n\nGive 3 short search phrases that would find people saying existing solutions are good enough, too expensive, or that they do not need this. Return JSON: {"queries":["..."]}`,
      z.object({ queries: z.array(z.string()).min(1) }));
    const hn = (await Promise.all(queries.slice(0, 3).map(q => searchHN(q, 8)))).flat();
    const { data: ev } = await db.from("evidence").select("*").eq("project_id", projectId).eq("kind", "fact");
    const sources = numberSources([
      ...hn,
      ...(ev || []).map((e: any) => ({ url: e.source_url || "", date: e.source_date || "", type: e.source_type || "evidence", text: e.claim })),
    ]);
    if (!sources.length) throw new Error("No evidence yet. Run Discovery first.");

    const out = await askJSON(RULES,
      `${info}\n\nSOURCES:\n${list(sources)}\n\nYou are a RED TEAM. Your job is to argue AGAINST this idea. Find sources that contradict the founder's assumptions (customers who would not pay, people happy with existing tools, high costs). Return JSON: {"contradictions":[{"challenged_assumption":"","note":"","source_ids":["S1"]}],"strongest_case_against":"3-5 sentences","top_risks":[""],"would_change_my_mind":["what evidence would disprove your case"]}`,
      RedSchema);

    const contradictions = out.contradictions.map(c => {
      const ids = validIds(c.source_ids, sources);
      return { ...c, evidence: sources.filter(s => ids.includes(s.id)) };
    });
    await saveEvidence(db, projectId, contradictions.flatMap(c => [
      ...c.evidence.map(s => factRow(s, false)),
      { claim: c.note, kind: "inference", source_type: "ai", confidence: "low", supports: false },
    ]));
    data = { ...out, contradictions };
  }
  // >>> STEP 4, 5, 6, 7 BLOCKS GET PASTED HERE <<<

  if (data === undefined) throw new Error("Unknown module");

  // save the result so it is still there after a page refresh
  await db.from("outputs").delete().eq("project_id", projectId).eq("module", module);
  await db.from("outputs").insert({ project_id: projectId, module, data });
  return data;
}