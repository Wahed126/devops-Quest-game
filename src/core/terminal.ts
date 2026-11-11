import { CONFIG, SCRIPT, SERVICE_CONFIG, executable, validPort, reconcile, type State } from './state';
export interface CommandResult { output: string; clear?: boolean; edit?: string }
export function resolvePath(path: string, cwd='/'): string {
 const parts=(path.startsWith('/')?path:`${cwd}/${path}`).split('/'); const result:string[]=[];
 for(const p of parts) {if(p==='..') result.pop(); else if(p && p!=='.') result.push(p);}
 return '/'+result.join('/');
}
export function tokenize(input: string): string[] {
 const words:string[]=[];let word='',quote='',started=false;
 for(const c of input.trim()) {
  if(quote) {if(c===quote)quote='';else word+=c;started=true;}
  else if(c==='"'||c==="'") {quote=c;started=true;}
  else if(/\s/.test(c)) {if(started)words.push(word);word='';started=false;}
  else {word+=c;started=true;}
 }
 if(quote) throw new Error('Unclosed quote. Add the matching quote and try again.');
 if(started)words.push(word); return words;
}
function permissionString(mode: number): string {return String(mode).split('').map(v=>{const n=Number(v);return `${n&4?'r':'-'}${n&2?'w':'-'}${n&1?'x':'-'}`;}).join('');}
export class Terminal {
 constructor(public state: State) {}
 run(input: string): CommandResult {
  let args:string[];try{args=tokenize(input);}catch(e){return {output:(e as Error).message};}
  const cmd=args.shift(); if(!cmd)return {output:''};
  const s=this.state;
  const done=(output:string):CommandResult=>{reconcile(s);return {output};};
  const path=(p:string)=>resolvePath(p,s.cwd);
  const usage=(syntax:string)=>({output:`Usage: ${syntax}`});
  if(args.some(a=>['|','>','>>','&&',';'].includes(a))) return done('Pipes, redirection, and command chaining are not simulated. Run one command at a time.');
  switch(cmd) {
   case 'help':return done('pwd                      show your current directory\nls [-l] [path]           list files; -l shows permissions\ncd [path]                change directory; .. goes up\ncat <file>               read a file\nchmod +x|755 <file>       allow the bridge script to run\n/path/to/start.sh         execute the mission script\nsystemctl status beacon  inspect the service\njournalctl -u beacon     read the service logs\nedit <file>              game-only configuration editor\nsystemctl restart beacon restart using saved configuration\nclear                    clear this terminal\n\nAbsolute paths start at /. Relative paths start at your current directory. Quoted paths are supported. This is a small simulator, not a general shell.');
   case 'clear':return {output:'',clear:true};
   case 'pwd':return args.length?usage('pwd'):done(s.cwd);
   case 'cd':{
    if(args.length>1)return usage('cd [directory]'); const p=path(args[0]??'/home/engineer');
    if(!s.fs[p])return done(`cd: ${p}: No such directory. Try ls / to explore.`);
    if(s.fs[p].kind!=='dir')return done(`cd: ${p}: Not a directory. Use cat to read files.`);
    s.cwd=p;return done('');
   }
   case 'ls':{
    const long=args.includes('-l');const paths=args.filter(a=>a!=='-l');
    if(paths.length>1||paths.some(a=>a.startsWith('-')))return usage('ls [-l] [path]');
    const p=path(paths[0]??'.'),node=s.fs[p];if(!node)return done(`ls: ${p}: No such file or directory.`);
    const entries=node.kind==='file'?[p]:Object.keys(s.fs).filter(k=>k!==p&&k.slice(0,k.lastIndexOf('/'))===(p==='/'?'':p)).sort();
    return done(entries.map(k=>{const n=s.fs[k],name=k.split('/').pop()+(n.kind==='dir'?'/':'');return long?`${n.kind==='dir'?'d':'-'}${permissionString(n.mode)}  engineer forest  ${String(n.content.length).padStart(4)}  ${name}`:name;}).join(long?'\n':'  ')||'(empty directory)');
   }
   case 'cat':{
    if(!args.length)return usage('cat <file> [file...]');
    return done(args.map(a=>{const p=path(a),node=s.fs[p];if(!node)return `cat: ${p}: No such file.`;if(node.kind==='dir')return `cat: ${p}: Is a directory. Use ls to explore it.`;if(p===CONFIG)s.readConfig=true;return node.content;}).join('\n'));
   }
   case 'chmod':{
    if(args.length!==2)return usage('chmod +x|755 <file>');
    const p=path(args[1]),node=s.fs[p];if(!node)return done(`chmod: ${p}: No such file.`);
    if(p!==SCRIPT)return done('This lesson supports permission changes to /opt/bridge/start.sh only.');
    if(args[0]==='+x')node.mode=parseInt((parseInt(String(node.mode),8)|0o111).toString(8),10);
    else if(args[0]==='755')node.mode=755;
    else return done('Use +x to add execute permission, or 755 for rwxr-xr-x. Broad write access such as 777 is unnecessary.');
    return done(`Permissions updated: ${permissionString(node.mode)}. Now run the script by its path.`);
   }
   case 'systemctl':{
    if(args.length!==2||!['status','restart'].includes(args[0]))return usage('systemctl status|restart beacon');
    if(args[1]!=='beacon')return done(`Unit ${args[1]} not found. The simulated service is beacon.`);
    if(args[0]==='status')return done(`● beacon.service — Forest energy network\n  Loaded: loaded (training environment)\n  Active: ${s.service==='active'?'active (running)':'failed (configuration error)'}\n${s.serviceLog}`);
    if(!validPort(s.fs[SERVICE_CONFIG].content)) {s.service='failed';s.serviceLog='beacon: invalid PORT. Expected an integer from 1 to 65535.\nConfiguration: /etc/beacon/beacon.conf';return done('Restart failed.\n'+s.serviceLog+'\nUse edit to repair the configuration, save, then restart.');}
    if(!s.completed.includes('bridge'))return done('The upstream bridge is still offline. Restore its connection before starting this service.');
    s.service='active';s.serviceRestored=true;s.serviceLog='beacon: configuration accepted. Service started successfully.\nEnergy network online. Final lift powered.';
    return done(s.serviceLog);
   }
   case 'journalctl':if(args.length!==2||args[0]!=='-u')return usage('journalctl -u beacon');else return done(args[1]==='beacon'?`-- beacon service log --\n${s.serviceLog}`:`No logs for ${args[1]}. Try beacon.`);
   case 'edit':{
    if(args.length!==1)return usage('edit /etc/beacon/beacon.conf');const p=path(args[0]);
    if(p!==SERVICE_CONFIG)return done('The game editor supports /etc/beacon/beacon.conf only. Other training files are read-only.');
    return {output:'Opening game editor (a training shortcut, not a standard Linux command).',edit:p};
   }
   default:{
    if(cmd.includes('/')) {
     const p=path(cmd),node=s.fs[p];if(!node)return done(`${cmd}: No such file or directory.`);
     if(node.kind==='dir')return done(`${cmd}: Is a directory. Use cd to enter it.`);
     if(!executable(node.mode))return done(`${cmd}: Permission denied.\nThe file is not executable. Inspect it with ls -l, then use chmod +x to add execute permission.`);
     if(p!==SCRIPT)return done('Only the bridge mission script can be executed in this simulator.');
     if(args.length)return usage('/opt/bridge/start.sh');
     if(!s.completed.includes('signal'))return done('The beacon has no signal. Tune its channel before starting the bridge.');
     s.bridgeRan=true;return done('[ OK ] Access verified.\n[ OK ] Bridge motors engaged.\nConnection restored. The crossing is open.');
    }
    return done(`${cmd}: command not supported. Type help to see the training commands. Commands are case-sensitive.`);
   }
  }
 }
 tune(channel: string): CommandResult {
  if(!this.state.readConfig)return {output:'Read the beacon configuration first so you can verify its channel. Try cat with the configuration path.'};
  if(channel.trim()!=='aurora')return {output:'That channel does not match the configuration. Look for BEACON_CHANNEL in beacon.conf.'};
  this.state.channel=channel.trim();reconcile(this.state);return {output:'Channel aurora locked. Beacon online. The light-path is restored.'};
 }
}
