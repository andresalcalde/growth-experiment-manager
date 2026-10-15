import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, beforeEach, mock, test } from 'node:test';
import ts from 'typescript';
let signFails, removed, fetched, writes;
const supabase={
 from(){return {select(){return this;},eq(){return this;},async single(){return {data:{project_id:'project'},error:null};}};},
 async rpc(){return {data:false,error:null};},
 storage:{from(){return {
  async createSignedUrl(path){return signFails?{error:new Error('transient')}:{data:{signedUrl:`https://signed/${path}`},error:null};},
  async upload(){writes++;return {error:null};},async remove(paths){removed.push(...paths);return {error:null};},
 };}},
};
// Compile only syntax and replace the browser-only Supabase import with a test fixture.
async function load(path,imports){
 let source=await readFile(new URL(path,import.meta.url),'utf8');
 for(const [from,to] of imports) source=source.replace(from,to);
 return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`);
}
globalThis.__ghEvidenceTest={supabase};
const evidence=await load('../src/lib/uploadEvidence.ts',[["import { supabase } from './supabase';","const { supabase } = globalThis.__ghEvidenceTest;"]]);
const hooks=await load('../src/hooks/useNSMAutosync.ts',[
 ["import { supabase } from '../lib/supabase';","const { supabase } = globalThis.__ghEvidenceTest;"],
 ["import { useCallback, useState } from 'react';","const useCallback = fn => fn; const useState = initial => [initial, () => {}];"],
]);
beforeEach(()=>{signFails=false;removed=[];writes=0;fetched=0;});
after(()=>{delete globalThis.__ghEvidenceTest;mock.restoreAll();});
test('failed signatures preserve persistent references through add/remove edits',async()=>{
 const refs=['storage://experiment-evidence/project/exp/a.png','storage://experiment-evidence/project/exp/b.png'];
 signFails=true;const urls=await evidence.resolveEvidence(refs);
 assert.deepEqual(Object.keys(urls),refs);assert.deepEqual(Object.values(urls),[null,null]);
 assert.equal(evidence.displayEvidence(refs[0],urls),'Evidencia no disponible');
 const added=[...refs,'data:image/png;base64,example'];assert.deepEqual(added.map(evidence.evidenceReference).slice(0,2),refs);
 const explicitlyRemoved=added.filter((_,i)=>i!==1).map(evidence.evidenceReference);
 assert.deepEqual(explicitlyRemoved,[refs[0],added[2]]);assert.deepEqual(removed,[]);
 signFails=false;assert.equal(evidence.displayEvidence(refs[0],await evidence.resolveEvidence(refs)),'https://signed/project/exp/a.png');
});
test('upload returns a durable reference even when signing is unavailable',async()=>{
 signFails=true;const ref=await evidence.uploadExperimentEvidence('exp',{name:'proof.png',type:'image/png'});
 assert.ok(ref.startsWith('storage://experiment-evidence/project/exp/'));assert.equal(writes,1);
 await evidence.deleteExperimentEvidence(ref);assert.deepEqual(removed,[ref.replace('storage://experiment-evidence/','')]);
});
test('legacy signed/public URLs normalize to enduring keys',()=>{
 assert.equal(evidence.evidenceReference('https://test/storage/v1/object/sign/experiment-evidence/a%20b.png?token=expiring'),'storage://experiment-evidence/a b.png');
});
test('viewer NSM never fetches CSV or writes status',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{fetched++;throw new Error('must not fetch');};
 try{const result=await hooks.useNSMAutosync().syncFromGoogleSheets('project','https://source',{});
 assert.equal(result.success,false);assert.equal(fetched+writes,0);}finally{globalThis.fetch=original;}
});
