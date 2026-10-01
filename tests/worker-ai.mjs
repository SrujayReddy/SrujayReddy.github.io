/* No network, credentials or inference. Exercise the actual Worker contracts. */
import assert from 'node:assert/strict';
import worker from '../agent-worker/worker.js';
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Unexpected external request'); };
const origin = 'https://srujayreddy.github.io';
const enc = new TextEncoder();
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const request = (body, options = {}) => new Request('https://agent.test', {
  method: 'POST', headers: { 'content-type': 'application/json', Origin: origin, 'CF-Connecting-IP': '192.0.2.10' },
  body: JSON.stringify(body), ...options,
});
const stream = (text, chunkSize = 7, onCancel = () => {}) => {
  const bytes = enc.encode(text); let offset = 0;
  return new ReadableStream({ pull(c) { if (offset >= bytes.length) return c.close(); c.enqueue(bytes.slice(offset, offset += chunkSize)); }, cancel: onCancel });
};
const answer = 'data: {"response":"Srujay works at Amazon. 🍕"}\r\n\r\ndata: [DONE]\r\n\r\n';
const envFor = (run = async () => stream(answer)) => ({ AI: { run }, ALLOWED_ORIGIN: origin });
const call = (body = { question: 'Where does Srujay work?' }, env = envFor()) => worker.fetch(request(body), env, {});
const theme = { bg: '#061020', ink: '#f5f5ff', accent: '#55ccff', plasma: ['#55ccff','#aabbff','#aaffee'], font: 'Arial,sans-serif', fontDisplay: 'Georgia,serif', mood: 'Ocean glass', background: 'waves' };
const readEvents = async response => (await response.text()).split('\n\n').filter(Boolean).map(s => s.slice(6) === '[DONE]' ? '[DONE]' : JSON.parse(s.slice(6)));

test('default binding wins over old secrets; bounded grounded messages and stable SSE', async () => {
  let args; const env = { ...envFor(async (...a) => { args = a; return stream(answer, 1); }), ANTHROPIC_API_KEY: 'unused', GEMINI_API_KEY: 'unused' };
  const r = await call({ question: 'x'.repeat(900) }, env);
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/event-stream/);
  assert.equal(r.headers.get('access-control-allow-origin'),origin);
  assert.deepEqual(await readEvents(r),[{text:'Srujay works at Amazon. 🍕'},'[DONE]']);
  assert.equal(args[0],'@cf/meta/llama-3.1-8b-instruct-fp8');assert.equal(args[1].max_tokens,400);
  assert.equal(args[1].messages[1].content.length,600);assert.match(args[1].messages[0].content,/Amazon.*Software Development Engineer I/s);
  assert.ok(args[2].signal instanceof AbortSignal);
});
test('missing binding or invalid provider never uses paid secrets',async()=>{
  for(const env of [{ANTHROPIC_API_KEY:'unused'},{AI_PROVIDER:'typo',...envFor()},{AI_PROVIDER:'gemini',...envFor()}]){
    const r=await call(undefined,env);assert.equal(r.status,503);assert.equal((await r.json()).error,'not_configured');
  }
});
test('legacy benchmark is unavailable even with a paid key',async()=>{
 const r=await call({mode:'bench',question:'test'},{ANTHROPIC_API_KEY:'unused'});assert.equal(r.status,503);assert.equal((await r.json()).error,'bench_unavailable');
});
test('CORS, methods and malformed/empty inputs reject before inference',async()=>{
 const env=envFor(()=>{throw new Error('Must not infer')});
 assert.equal((await worker.fetch(new Request('https://a',{method:'OPTIONS'}),env,{})).status,204);
 assert.equal((await worker.fetch(new Request('https://a'),env,{})).status,405);
 assert.equal((await worker.fetch(request({question:'a'},{headers:{Origin:'https://other.test'}}),env,{})).status,403);
 for(const body of [null,[],{}, {mode:'unknown'},{mode:'vibe',prompt:''}])assert.equal((await call(body,env)).status,400);
 assert.equal((await worker.fetch(request({}, {body:'{bad'}),env,{})).status,400);
});
test('both modes enforce optional Turnstile before inference',async()=>{
 for(const body of [{question:'Amazon?'},{mode:'vibe',prompt:'ocean'}])assert.equal((await call(body,{...envFor(),TURNSTILE_SECRET:'test-only'})).status,403);
});
test('structured Vibe schema unwraps object/string and filters extra keys',async()=>{
 for(const encoded of [false,true]){
 let args;const r=await call({mode:'vibe',prompt:'ocean'.repeat(40)},envFor(async(...a)=>{args=a;return {response:encoded?JSON.stringify({...theme,extra:'drop'}):{...theme,extra:'drop'}}}));
 assert.equal(r.status,200);assert.deepEqual(await r.json(),theme);
 assert.equal(args[0],'@cf/meta/llama-3.3-70b-instruct-fp8-fast');assert.equal(args[1].response_format.type,'json_schema');assert.equal(args[1].max_tokens,1024);
 assert.equal(args[1].messages[1].content.length,126);assert.ok(!args[1].messages[0].content.includes('call generate_theme'));
 }
});
test('malformed generated themes reject without a fallback provider',async()=>{
 for(const value of ['{bad',[],null,{...theme,bg:'url(evil)'},{...theme,plasma:['#000000']},{...theme,background:'injected-script'},{...theme,font:22}]){
 const r=await call({mode:'vibe',prompt:'ocean'},envFor(async()=>({response:value})));assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'no_theme'});
 }
});
test('confirmed daily exhaustion, temporary capacity and unknown errors stay distinct and sanitized',async()=>{
 for(const [code,status,expected] of [[3036,429,'daily_limit'],[3040,429,'rate_limited'],[429,429,'rate_limited'],[5035,503,'not_configured'],[3007,504,'upstream_timeout'],[9999,502,'upstream_error']]){
 const r=await call(undefined,envFor(async()=>{throw Object.assign(new Error('secret must not leak'),{code})}));assert.equal(r.status,status);assert.deepEqual(await r.json(),{error:expected});
 }
 const r=await call(undefined,envFor(async()=>{throw new Error('3036: daily allowance')}));assert.equal((await r.json()).error,'daily_limit');
});
test('minute/day KV limits stop inference; a broken limiter fails closed',async()=>{
 for(const [daily,error] of [[false,'rate_limited'],[true,'daily_limit']]){
 let calls=0;const kv={get:async key=>key.includes(daily?'day:':'ip:')?'9999':null,put:async()=>{}};
 const r=await call(undefined,{...envFor(async()=>{calls++;return stream(answer)}),RATE_KV:kv});assert.equal(r.status,429);assert.equal((await r.json()).error,error);assert.equal(calls,0);
 }
 const r=await call(undefined,{...envFor(),RATE_KV:{get:async()=>{throw new Error('KV down')}}});assert.equal(r.status,503);
});
test('successful limiter writes bounded fixed-window counters',async()=>{
 const puts=[];const r=await call(undefined,{...envFor(),RATE_KV:{get:async()=>null,put:async(...a)=>puts.push(a)}});await r.text();
 assert.equal(puts.length,2);assert.ok(puts.some(([key,value,opts])=>key.startsWith('ip:')&&value==='1'&&opts.expirationTtl===120));
 assert.ok(puts.some(([key,value,opts])=>key.startsWith('day:')&&opts.expirationTtl===90000));
});
test('truncated, empty, malformed and oversized streams are explicit failures',async()=>{
 for(const input of ['data: {"response":"partial"}\n\n','data: [DONE]\n\n','data: {bad}\n\n','data: '+ 'x'.repeat(66000)]){
 const events=await readEvents(await call(undefined,envFor(async()=>stream(input,10000))));assert.equal(events.at(-1),'[DONE]');assert.ok(events.some(e=>e.error));
 }
});
test('SSE error codes and alternate chat delta format survive chunking',async()=>{
 const events=await readEvents(await call(undefined,envFor(async()=>stream('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: {"error":{"code":3036}}\n\n',3))));
 assert.deepEqual(events,[{text:'Hello'},{error:'daily_limit'},'[DONE]']);
});
test('client cancellation closes upstream',async()=>{
 let cancelled=false;const r=await call(undefined,envFor(async()=>stream(answer.repeat(50),8,()=>{cancelled=true})));
 const reader=r.body.getReader();await reader.read();await reader.cancel();assert.equal(cancelled,true);
});
test('deadline aborts initial inference and stalled response reading',async()=>{
 const r=await call(undefined,{...envFor((model,input,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))),AI_TIMEOUT_MS:10});assert.equal(r.status,504);
 let cancelled=false;const stalled=await call(undefined,{...envFor(async()=>new ReadableStream({cancel(){cancelled=true}})),AI_TIMEOUT_MS:10});
 const events=await readEvents(stalled);assert.equal(events[0].error,'stream_interrupted');assert.equal(cancelled,true);
});
test('Gemini/Anthropic require explicit selection and preserve streaming contracts',async()=>{
 try {
 for(const provider of ['gemini','anthropic']){
 let seen;globalThis.fetch=async(url,opts)=>{seen={url,opts};return new Response(stream(provider==='gemini'?'data: {"candidates":[{"content":{"parts":[{"text":"Gemini"}]},"finishReason":"STOP"}]}\n\n':'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Claude"}}\n\ndata: {"type":"message_stop"}\n\n'))};
 const r=await call(undefined,{AI_PROVIDER:provider,GEMINI_API_KEY:'test-key',ANTHROPIC_API_KEY:'test-key'});const events=await readEvents(r);
 assert.equal(events[0].text,provider==='gemini'?'Gemini':'Claude');assert.equal(events.at(-1),'[DONE]');assert.ok(seen.opts.signal instanceof AbortSignal);
 assert.match(seen.url,provider==='gemini'?/googleapis.com/:/anthropic.com/);
 }
 }finally{globalThis.fetch=async()=>{throw new Error('Unexpected external request')}}
});
try {for(const [name,fn] of tests){await fn();console.log('PASS '+name)}console.log(`\n${tests.length} Worker contract checks passed without network or inference.`)}
finally{globalThis.fetch=originalFetch}
