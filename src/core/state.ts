import { missions, journalEntries, type MissionId } from './content';
export interface FileNode { kind: 'file' | 'dir'; content: string; mode: number }
export interface State {
 version: 1; started: boolean; completed: MissionId[]; checkpoint: number; cwd: string;
 fs: Record<string,FileNode>; service: 'failed'|'active'; serviceLog: string; readConfig: boolean;
 bridgeRan: boolean; serviceRestored: boolean; channel: string; journal: string[]; hints: Record<MissionId,number>;
 settings: { reducedMotion: boolean }; finished: boolean;
}
export const SAVE_KEY = 'devops-quest.v1';
export const CONFIG = '/opt/beacon/config/beacon.conf';
export const SCRIPT = '/opt/bridge/start.sh';
export const SERVICE_CONFIG = '/etc/beacon/beacon.conf';
export function initialState(): State {
 const fs: State['fs'] = {};
 for (const path of ['/','/home','/home/engineer','/opt','/opt/beacon','/opt/beacon/config','/opt/bridge','/etc','/etc/beacon']) fs[path]={kind:'dir',content:'',mode:755};
 fs[CONFIG]={kind:'file',content:'# Beacon training configuration\nBEACON_CHANNEL=aurora\n',mode:644};
 fs[SCRIPT]={kind:'file',content:'#!/bin/sh\n# Training script: powers the rootbound bridge.\n# Execute this file after repairing its permissions.\n',mode:644};
 fs[SERVICE_CONFIG]={kind:'file',content:'# Beacon service configuration\nPORT=invalid\n',mode:644};
 fs['/home/engineer/README.txt']={kind:'file',content:'Welcome, engineer.\nThe beacon configuration is in /opt/beacon/config.\nUse help to see the supported training commands.\n',mode:644};
 return {version:1,started:false,completed:[],checkpoint:0,cwd:'/home/engineer',fs,service:'failed',serviceLog:'beacon: invalid PORT. Expected an integer from 1 to 65535.\nConfiguration: /etc/beacon/beacon.conf',readConfig:false,bridgeRan:false,serviceRestored:false,channel:'',journal:[],hints:{signal:0,bridge:0,service:0},settings:{reducedMotion:false},finished:false};
}
export function validPort(content: string): boolean {
 const ports = content.split('\n').map(l=>l.trim()).filter(l=>l.startsWith('PORT='));
 if(ports.length !== 1) return false;
 const value=ports[0].slice(5).trim();
 return /^\d+$/.test(value) && Number(value)>=1 && Number(value)<=65535;
}
export function executable(mode: number): boolean {return (parseInt(String(mode),8) & 0o100)!==0;}
export function reconcile(s: State): MissionId[] {
 const added: MissionId[]=[];
 const conditions = {signal:s.readConfig && s.channel==='aurora',bridge:s.bridgeRan,service:s.serviceRestored};
 for (const m of missions) {
  if(!s.completed.includes(m.id) && conditions[m.id] && (m.id==='signal'||s.completed.includes(m.id==='bridge'?'signal':'bridge'))) {
   s.completed.push(m.id); added.push(m.id);
   for(const cmd of m.commands) if(!s.journal.includes(cmd)) s.journal.push(cmd);
  }
 }
 return added;
}
export function restore(raw: string | null): State {
 const base=initialState(); if(!raw) return base;
 try {
  const v: unknown=JSON.parse(raw);
  if(!v || typeof v!=='object') return base;
  const s=v as State;
  if(s.version!==1 || typeof s.started!=='boolean'||typeof s.finished!=='boolean'||!Array.isArray(s.completed)||!Array.isArray(s.journal)||!s.fs||typeof s.fs!=='object'||!s.settings||typeof s.settings.reducedMotion!=='boolean'||!s.hints) return base;
  if(!Number.isInteger(s.checkpoint)||s.checkpoint<0||s.checkpoint>3||typeof s.cwd!=='string'||typeof s.readConfig!=='boolean'||typeof s.bridgeRan!=='boolean'||typeof s.channel!=='string'||!['active','failed'].includes(s.service)||typeof s.serviceLog!=='string') return base;
  if(typeof s.serviceRestored!=='boolean'||s.completed.some(id=>!missions.some(m=>m.id===id))||new Set(s.completed).size!==s.completed.length||s.journal.some(k=>typeof k!=='string'||!journalEntries[k])) return base;
  if(Object.keys(s.fs).length!==Object.keys(base.fs).length) return base;
  for(const [path,def] of Object.entries(base.fs)) {
   const n=s.fs[path]; if(!n||n.kind!==def.kind||typeof n.content!=='string'||n.content.length>20000||!Number.isInteger(n.mode)||! /^[0-7]{3}$/.test(String(n.mode))) return base;
  }
  if(s.fs[s.cwd]?.kind!=='dir'||missions.some(m=>!Number.isInteger(s.hints[m.id])||s.hints[m.id]<0||s.hints[m.id]>3)) return base;
  if(s.fs[CONFIG].content!==base.fs[CONFIG].content||s.fs[SCRIPT].content!==base.fs[SCRIPT].content) return base;
  // Reconstruct progression from the same durable events used by live play.
  s.completed=[]; reconcile(s);
  s.checkpoint=Math.min(s.checkpoint,s.completed.length);
  s.finished=s.finished&&s.completed.length===3;
  return s;
 } catch { return base; }
}
export function load(): State {try{return restore(localStorage.getItem(SAVE_KEY));}catch{return initialState();}}
export function save(s: State): boolean {try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
