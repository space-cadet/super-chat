import { expect,it } from 'vitest';
import { ChatEngine } from './ChatEngine';
import { toStoredSession } from './conversationFormat';
import type { LLMAdapter } from './types';
it('runs selected profiles in order with one visible user message and preserved attribution',async()=>{
 const calls:string[]=[];
 const adapter={getProviders:()=>[],getModels:()=>[],async *streamChat(_messages:unknown,_signal:unknown,request:{providerProfileId?:string}){calls.push(request.providerProfileId!);yield `Answer from ${request.providerProfileId}`;}} as unknown as LLMAdapter;
 const engine=new ChatEngine({llmAdapter:adapter});engine.updateSettings({enableTools:false,enableRAG:false});engine.createSession('Agents');
 engine.configureGroupProfiles([{id:'one',name:'First',provider:'openai',model:'model-1'},{id:'two',name:'Second',provider:'openai',model:'model-2'}]);
 for await(const _event of engine.sendMessage('Question')){ /* drain */ }
 expect(calls).toEqual(['one','two']);
 const saved=toStoredSession(engine.getActiveSession()!);
 expect(saved.messages.filter(message=>message.role==='user')).toHaveLength(1);
 expect(saved.messages.filter(message=>message.role==='assistant').map(message=>[message.agentId,message.agentName])).toEqual([['one','First'],['two','Second']]);
});
it('stopping the first selected profile prevents subsequent profiles from starting',async()=>{
 const calls:string[]=[];
 const adapter={getProviders:()=>[],getModels:()=>[],async *streamChat(_messages:unknown,_signal:unknown,request:{providerProfileId?:string}){calls.push(request.providerProfileId!);yield 'First token';yield 'Second token';}} as unknown as LLMAdapter;
 const engine=new ChatEngine({llmAdapter:adapter});engine.updateSettings({enableTools:false,enableRAG:false});engine.createSession();engine.configureGroupProfiles([{id:'one',name:'First',provider:'openai',model:'a'},{id:'two',name:'Second',provider:'openai',model:'b'}]);
 for await(const event of engine.sendMessage('Question'))if(event.type==='text-delta')engine.stopStreaming();
 expect(calls).toEqual(['one']);expect(engine.isStreaming).toBe(false);
});
it('applies the auto-approve toggle to the real tool approval path',async()=>{
 const adapter={getProviders:()=>[],getModels:()=>[],async *streamChat(){yield 'unused';},async *streamChatWithTools(){yield {type:'tool-call',call:{id:'call',name:'write_test',args:{}}};yield {type:'finish',reason:'tool-calls-detected'};}} as unknown as LLMAdapter;
 let writes=0;const engine=new ChatEngine({llmAdapter:adapter,toolAdapter:{getAvailableTools:()=>[{name:'write_test',description:'Write',parameters:{},approval:'always'}],executeTool:async()=>{writes++;return {success:true,content:'Saved'};}}});
 engine.updateSettings({enableRAG:false,enableTools:true,maxAgentSteps:1,autoApply:true});engine.createSession();
 for await(const _event of engine.sendMessage('Write')){ /* drain */ }
 expect(writes).toBe(1);expect(engine.getSnapshot().pendingApprovals).toHaveLength(0);
});
it('enabling auto-approve releases an already waiting tool approval',async()=>{
 const adapter={getProviders:()=>[],getModels:()=>[],async *streamChat(){yield 'unused';},async *streamChatWithTools(){yield {type:'tool-call',call:{id:'waiting',name:'write_test',args:{}}};yield {type:'finish',reason:'tool-calls-detected'};}} as unknown as LLMAdapter;
 let writes=0,switched=false;const engine=new ChatEngine({llmAdapter:adapter,toolAdapter:{getAvailableTools:()=>[{name:'write_test',description:'Write',parameters:{},approval:'always'}],executeTool:async()=>{writes++;return {success:true};}}});
 engine.updateSettings({enableRAG:false,enableTools:true,maxAgentSteps:1,autoApply:false});engine.createSession();engine.subscribe(snapshot=>{if(!switched&&snapshot.pendingApprovals.length){switched=true;engine.updateSettings({autoApply:true});}});
 for await(const _event of engine.sendMessage('Write')){ /* drain */ }
 expect(switched).toBe(true);expect(writes).toBe(1);
});
