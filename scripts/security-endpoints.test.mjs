// All DB, Auth, Storage and provider requests are mocked; no network.
import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';
const originalFetch=globalThis.fetch;
Object.assign(process.env,{VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_SUPABASE_ANON_KEY:'test-anon',
 SUPABASE_SERVICE_ROLE_KEY:'test-service',OPENAI_API_KEY:'test-openai',RESEND_API_KEY:'test-resend'});
let state;
const id='30000000-0000-0000-0000-000000000001';
mock.module('@supabase/supabase-js',{namedExports:{createClient(_url,key,options){
 state.clients.push({key,options});
 return {
  auth:{async getUser(token){state.tokens.push(token);return {data:{user:token==='valid'?state.user:null},error:null};},
   admin:{async getUserById(userId){state.recipients.push(userId);return {data:{user:state.recipient},error:state.recipientError};}}},
  from(table){const query={key,table,filters:[]}; const chain={
   select(){return chain;},eq(...args){query.filters.push(args);return chain;},
   maybeSingle(){state.queries.push(query);return Promise.resolve(state.query(query));},
  };return chain;},
  async rpc(name,args){state.reservations.push({key,name,args});return state.rpc(name,args);},
  storage:{from(bucket){return {async createSignedUrl(path,ttl){state.signs.push({key,bucket,path,ttl});
   return {data:{signedUrl:`https://signed/${path}`},error:state.signError};}};}},
 };
}}});
const {default:notify}=await import('../api/send-notification.ts');
const {default:ai}=await import('../api/ai-assistant.ts');
const {default:library}=await import('../api/library-evidence.ts');
beforeEach(()=>{
 delete process.env.AI_ALLOWED_EMAIL_DOMAINS;delete process.env.AI_GLOBAL_DAILY_LIMIT;delete process.env.NOTIFICATIONS_FROM;
 state={user:{id:'sender',email:'sender@mmglatam.com',email_confirmed_at:'2026-01-01'},
  recipient:{id:'owner',email:'trusted@mmglatam.com',email_confirmed_at:'2026-01-01'},
  clients:[],tokens:[],queries:[],reservations:[],recipients:[],fetches:[],signs:[],
  experiment:{id,project_id:'project',owner_id:'owner',status:'Finished - Winner',title:'<img src=x onerror=alert(1)>'},
  profile:{global_role:'user'},write:true,quota:true,notification:'reserved',paths:['project/experiment/proof.png'],
  prefs:{volume:'all',notify_winner:true},
  query({table}){return {data:table==='profiles'?state.profile:state.experiment,error:null};},
  rpc(name){return {error:null,data:({gh_project_write:state.write,gh_reserve_ai_usage:state.quota,
   gh_reserve_notification:state.notification,get_notification_preference:state.prefs,gh_library_evidence_paths:state.paths})[name]};},
 };
 globalThis.fetch=async(url,init)=>{state.fetches.push({url,...init,body:JSON.parse(init.body)});return new Response('{}',{status:200});};
});
after(()=>{globalThis.fetch=originalFetch;mock.restoreAll();});
async function request(handler,body,token='valid',method='POST'){
 const response={code:0,body:null,headers:{},status(code){this.code=code;return this;},json(body){this.body=body;return this;},
 send(body){this.body=body;return this;},setHeader(k,v){this.headers[k]=v;}};
 await handler({method,headers:token?{authorization:`Bearer ${token}`}:{},body},response);return response;
}
const notification={experimentId:id};
const completion={model:'gpt-4o-mini',messages:[{role:'user',content:'hola'}]};
test('endpoints reject missing/invalid JWT and wrong methods before querying',async()=>{
 for(const handler of [notify,ai,library]){
  assert.equal((await request(handler,{},'invalid')).code,401);
  assert.equal((await request(handler,{},null)).code,401);
  assert.equal((await request(handler,{},'valid','GET')).code,405);
 }
 assert.equal(state.queries.length+state.fetches.length+state.reservations.length,0);
});
test('notification rejects arbitrary recipients, title, HTML and invalid IDs',async()=>{
 for(const body of [{to:'external@test.com',experimentTitle:'fake'}, {...notification,to:'external@test.com'},
 {...notification,html:'<script>'},{experimentId:'invalid'}]) assert.equal((await request(notify,body)).code,400);
 assert.equal(state.fetches.length+state.queries.length,0);
});
test('notification requires RLS-visible Winner with owner identity and write permission',async()=>{
 for(const experiment of [null,{...state.experiment,status:'Idea'},{...state.experiment,owner_id:null}]){
  const original=state.experiment;state.experiment=experiment;
  assert.equal((await request(notify,notification)).code,403);state.experiment=original;
 }
 state.write=false;assert.equal((await request(notify,notification)).code,403);
 assert.equal(state.fetches.length+state.recipients.length,0);
 assert.ok(state.queries.every(query=>query.key==='test-anon'));
});
test('notification uses Auth owner email, DB title, preferences and distributed reservation',async()=>{
 assert.equal((await request(notify,notification)).code,200);
 const mail=state.fetches[0].body;
 assert.deepEqual(mail.to,['trusted@mmglatam.com']);assert.deepEqual(state.recipients,['owner']);
 assert.match(mail.html,/&lt;img/);assert.ok(!mail.html.includes('<img'));
 assert.ok(state.reservations.some(r=>r.key==='test-service'&&r.name==='gh_reserve_notification'));
 assert.ok(!state.queries.some(q=>q.table==='profiles'));
 assert.equal(state.clients[0].options.global.headers.Authorization,'Bearer valid');
});
test('notification honors opt-out and unconfirmed owner email without consuming quota',async()=>{
 for(const prefs of [{volume:'none',notify_winner:true},{volume:'all',notify_winner:false}]){
  state.prefs=prefs;assert.equal((await request(notify,notification)).body.skipped,true);
 }
 state.prefs={volume:'all',notify_winner:true};state.recipient.email_confirmed_at=null;
 assert.equal((await request(notify,notification)).body.skipped,true);
 assert.equal(state.fetches.length,0);assert.ok(!state.reservations.some(r=>r.name==='gh_reserve_notification'));
});
test('notification DB quota, dedupe and backend errors prevent provider requests',async()=>{
 state.notification='quota';assert.equal((await request(notify,notification)).code,429);
 state.notification='duplicate';assert.equal((await request(notify,notification)).body.skipped,true);
 state.rpc=()=>({error:new Error('DB unavailable'),data:null});
 assert.equal((await request(notify,notification)).code,503);assert.equal(state.fetches.length,0);
});
test('notification sender honors only the allowlisted domain',async()=>{
 for(const [sender,expected] of [['Growth Hub <alerts@send.mmglatam.com>','Growth Hub <alerts@send.mmglatam.com>'],
 ['alerts@evil.test','no-reply@send.mmglatam.com'],['a@send.mmglatam.com.evil','no-reply@send.mmglatam.com'],
 ['a@send.mmglatam.com\r\nBcc:evil@test','no-reply@send.mmglatam.com']]){
  process.env.NOTIFICATIONS_FROM=sender;await request(notify,notification);assert.equal(state.fetches.at(-1).body.from,expected);
 }
});
test('AI domain and confirmation gate precedes quota/provider calls',async()=>{
 for(const user of [{...state.user,email:'external@evil.test'},{...state.user,email_confirmed_at:null},
 {...state.user,email:'sub@sub.mmglatam.com'}]){
  state.user=user;assert.equal((await request(ai,completion)).code,403);
 }
 assert.equal(state.reservations.length+state.fetches.length,0);
});
test('AI admin/superadmin exception uses trusted profile, not metadata',async()=>{
 state.user={id:'sender',email:'external@evil.test',user_metadata:{global_role:'superadmin'}};
 assert.equal((await request(ai,completion)).code,403);
 for(const role of ['admin','superadmin']){state.profile={global_role:role};assert.equal((await request(ai,completion)).code,200);}
});
test('AI configurable exact domains and global daily budget are forwarded',async()=>{
 process.env.AI_ALLOWED_EMAIL_DOMAINS='example.test';process.env.AI_GLOBAL_DAILY_LIMIT='123';
 state.user.email='user@example.test';assert.equal((await request(ai,{...completion,max_tokens:9000})).code,200);
 assert.deepEqual(state.reservations,[{key:'test-service',name:'gh_reserve_ai_usage',args:{p_user_id:'sender',p_global_limit:123}}]);
 assert.equal(state.fetches[0].body.max_tokens,1000);
});
test('AI missing profile does not cause 503 for confirmed allowed-domain user',async()=>{
 state.profile=null;assert.equal((await request(ai,completion)).code,200);
 state.quota=false;assert.equal((await request(ai,completion)).code,429);
 assert.equal(state.fetches.length,1);
});
test('AI invalid model/body/budget rejected before provider',async()=>{
 for(const body of [{...completion,model:'other'},{...completion,max_tokens:0},{messages:[]}]) assert.equal((await request(ai,body)).code,400);
 process.env.AI_GLOBAL_DAILY_LIMIT='NaN';assert.equal((await request(ai,completion)).code,503);
 assert.equal(state.fetches.length,0);
});
test('library signs only DB-authorized object keys with service role',async()=>{
 const result=await request(library,{experimentId:id,path:'foreign/attack.png'});
 assert.equal(result.code,200);assert.equal(result.headers['Cache-Control'],'private, no-store');
 assert.deepEqual(state.signs,[{key:'test-service',bucket:'experiment-evidence',path:state.paths[0],ttl:3600}]);
 assert.deepEqual(state.reservations,[{key:'test-anon',name:'gh_library_evidence_paths',args:{p_experiment:id}}]);
});
test('library unauthorized/private/unfinished experiment returns no signatures',async()=>{
 state.paths=[];assert.deepEqual((await request(library,{experimentId:id})).body,{urls:{}});
 assert.equal(state.signs.length,0);assert.equal(state.clients.length,1);
});
test('library signing failure preserves key with unavailable URL',async()=>{
 state.signError=new Error('unavailable');const result=await request(library,{experimentId:id});
 assert.equal(result.body.urls[`storage://experiment-evidence/${state.paths[0]}`],null);
});
