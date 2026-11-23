import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://sergiojr06.github.io";
const sample = {
  area:"software", mode:"nerd", question:"Tell me about a technical challenge you solved.",
  answer:"Yesterday I fix a problem in our application.", turnstileToken:"valid-test-token"
};
const feedback = {
  correctedAnswer:"Yesterday I fixed a problem in our application.",
  strengths:["A resposta menciona uma ação concreta."],
  issues:[{original:"fix",suggestion:"fixed",why:"A ação ocorreu ontem; use o passado."}],
  interviewTip:"Descreva como verificou a solução.",
  retryPrompt:"Reescreva acrescentando o resultado."
};
function createEnv(overrides = {}) {
  return {
    ALLOWED_ORIGIN:origin,
    EXPECTED_TURNSTILE_HOSTNAME:"sergiojr06.github.io",
    TURNSTILE_SECRET:"test-only",
    FEEDBACK_LIMITER:{limit:async()=>({success:true})},
    AI:{run:async()=>({response:feedback})},
    ...overrides
  };
}
function createRequest(body = sample, opts={}) {
  return new Request("https://example.workers.dev/api/feedback",{
    method:opts.method||"POST",
    headers:{Origin:opts.origin??origin,"Content-Type":opts.contentType||"application/json",
      "CF-Connecting-IP":"203.0.113.1"},
    body:opts.method==="OPTIONS"?undefined:(typeof body==="string"?body:JSON.stringify(body))
  });
}
test("Debug English Worker: valida e protege o endpoint", async t => {
  const previousFetch=globalThis.fetch;
  t.after(()=>{globalThis.fetch=previousFetch;});
  globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,hostname:"sergiojr06.github.io"})});

  await t.test("health retorna estado configurado", async()=>{
    const r=await worker.fetch(new Request("https://example.workers.dev/health"),createEnv());
    assert.equal(r.status,200);
    assert.equal((await r.json()).configured,true);
  });
  await t.test("cors bloqueia origem externa", async()=>{
    const r=await worker.fetch(createRequest(sample,{origin:"https://evil.invalid"}),createEnv());
    assert.equal(r.status,403);
  });
  await t.test("preflight permite origin de GitHub Pages", async()=>{
    const r=await worker.fetch(createRequest(sample,{method:"OPTIONS"}),createEnv());
    assert.equal(r.status,204);
    assert.equal(r.headers.get("Access-Control-Allow-Origin"),origin);
  });
  await t.test("rejeita resposta curta", async()=>{
    const r=await worker.fetch(createRequest({...sample,answer:"hi"}),createEnv());
    assert.equal(r.status,422);
  });
  await t.test("rejeita formato inválido", async()=>{
    const r=await worker.fetch(createRequest("not-json"),createEnv());
    assert.equal(r.status,400);
  });
  await t.test("limita o corpo", async()=>{
    const r=await worker.fetch(createRequest({...sample,answer:"a".repeat(7000)}),createEnv());
    assert.equal(r.status,413);
  });
  await t.test("rejeita verificacao anti-bot inválida", async()=>{
    globalThis.fetch=async()=>({ok:true,json:async()=>({success:false})});
    const r=await worker.fetch(createRequest(),createEnv());
    assert.equal(r.status,403);
    globalThis.fetch=async()=>({ok:true,json:async()=>({success:true,hostname:"sergiojr06.github.io"})});
  });
  await t.test("limite por IP retorna 429", async()=>{
    const r=await worker.fetch(createRequest(),createEnv({FEEDBACK_LIMITER:{limit:async()=>({success:false})}}));
    assert.equal(r.status,429);
  });
  await t.test("serviço desconfigurado não chama IA", async()=>{
    const r=await worker.fetch(createRequest(),createEnv({AI:null}));
    assert.equal(r.status,503);
  });
  await t.test("resposta da IA malformada não vira correção fictícia", async()=>{
    const r=await worker.fetch(createRequest(),createEnv({AI:{run:async()=>({response:"wrong"})}}));
    assert.equal(r.status,502);
  });
  await t.test("feedback válido aparece com correções e cabeçalhos de privacidade", async()=>{
    const r=await worker.fetch(createRequest(),createEnv());
    assert.equal(r.status,200);
    const data=await r.json();
    assert.equal(data.feedback.correctedAnswer,feedback.correctedAnswer);
    assert.equal(data.feedback.issues[0].suggestion,"fixed");
    assert.equal(r.headers.get("Cache-Control"),"no-store");
  });
});
