import { describe, it, expect } from 'vitest';
import { initialState, restore, reconcile, validPort, CONFIG, SCRIPT, SERVICE_CONFIG, type State } from '../src/core/state';
import { Terminal, resolvePath, tokenize } from '../src/core/terminal';
function signal(s:State,t:Terminal){t.run(`cat ${CONFIG}`);t.tune('aurora');expect(s.completed).toContain('signal');}
function bridge(s:State,t:Terminal){signal(s,t);t.run(`chmod +x ${SCRIPT}`);t.run(SCRIPT);expect(s.completed).toContain('bridge');}
describe('path handling and parsing',()=>{
 it.each([['../config/./beacon.conf','/opt/beacon/logs','/opt/beacon/config/beacon.conf'],['../../../../../','/home/engineer','/'],['/opt//bridge/../beacon/','/home','/opt/beacon'],['.','/home/engineer','/home/engineer']])('resolves %s from %s',(a,b,result)=>expect(resolvePath(a,b)).toBe(result));
 it('handles quotes and diagnoses unfinished arguments',()=>{expect(tokenize('cat "/opt/beacon/config/beacon.conf"')).toEqual(['cat',CONFIG]);expect(tokenize("cd '/home/engineer'")).toEqual(['cd','/home/engineer']);expect(()=>tokenize('cat "oops')).toThrow('Unclosed');});
 it('navigates and reads relative paths',()=>{const s=initialState(),t=new Terminal(s);t.run('cd /opt/beacon');expect(t.run('ls config').output).toContain('beacon.conf');t.run('cd ./config');expect(t.run('cat ../config/beacon.conf').output).toContain('BEACON_CHANNEL=aurora');expect(s.readConfig).toBe(true);});
 it('never executes shell syntax or HTML',()=>{const t=new Terminal(initialState());expect(t.run('cat x | pwd').output).toContain('not simulated');expect(t.run('<img onerror=alert(1)>').output).toContain('not supported');});
});
describe('mission evidence and permissions',()=>{
 it('requires reading the configuration and tuning the correct channel',()=>{const s=initialState(),t=new Terminal(s);expect(t.tune('aurora').success).toBe(false);expect(s.completed).toEqual([]);t.run('cat '+CONFIG);expect(t.tune('wrong').success).toBe(false);expect(s.completed).toEqual([]);expect(t.tune(' aurora ').success).toBe(true);expect(s.completed).toEqual(['signal']);expect(s.journal).toContain('cat');expect(t.tune('wrong').success).toBe(false);expect(s.completed).toEqual(['signal']);});
 it.each(['+x','755'])('accepts chmod %s and relative script execution',mode=>{const s=initialState(),t=new Terminal(s);signal(s,t);expect(t.run(SCRIPT).output).toContain('Permission denied');t.run('cd /opt/bridge');t.run(`chmod ${mode} start.sh`);expect(t.run('ls -l ./start.sh').output).toContain('-rwxr-xr-x');expect(s.completed).toEqual(['signal']);t.run('./start.sh');expect(s.completed).toEqual(['signal','bridge']);});
 it('rejects unnecessary broad permissions and unknown scripts',()=>{const s=initialState(),t=new Terminal(s);expect(t.run(`chmod 777 ${SCRIPT}`).output).toContain('unnecessary');expect(s.fs[SCRIPT].mode).toBe(644);expect(t.run('/bin/bash').output).toContain('No such file');});
 it('does not unlock an upstream mission from a command match',()=>{const s=initialState(),t=new Terminal(s);t.run('chmod +x '+SCRIPT);t.run(SCRIPT);expect(s.bridgeRan).toBe(false);expect(reconcile(s)).toEqual([]);});
});
describe('service configuration and restarts',()=>{
 it.each(['0','65536','1.5','-1','abc','','80 # invalid','+80'])('rejects invalid port %s',port=>expect(validPort('PORT='+port)).toBe(false));
 it.each(['1','80','8080','65535'])('accepts port %s',port=>expect(validPort('# config\nPORT='+port+'\n')).toBe(true));
 it('requires one unambiguous PORT setting',()=>expect(validPort('PORT=80\nPORT=443')).toBe(false));
 it('shows useful logs and fails until a saved config is restarted',()=>{const s=initialState(),t=new Terminal(s);bridge(s,t);expect(t.run('systemctl status beacon').output).toContain('failed');expect(t.run('journalctl -u beacon').output).toContain('1 to 65535');expect(t.run('systemctl restart beacon').output).toContain('Restart failed');expect(t.run('edit '+SERVICE_CONFIG).edit).toBe(SERVICE_CONFIG);s.fs[SERVICE_CONFIG].content='PORT=8080';expect(s.service).toBe('failed');expect(s.completed).toHaveLength(2);t.run('systemctl restart beacon');expect(s.service).toBe('active');expect(s.completed).toEqual(['signal','bridge','service']);});
 it('reports a new failure after an invalid config change and restart',()=>{const s=initialState(),t=new Terminal(s);bridge(s,t);s.fs[SERVICE_CONFIG].content='PORT=80';t.run('systemctl restart beacon');s.fs[SERVICE_CONFIG].content='PORT=bad';t.run('systemctl restart beacon');expect(s.service).toBe('failed');expect(s.serviceLog).toContain('invalid PORT');});
});
describe('save validation and restoration',()=>{
 it('round-trips filesystem, checkpoint, lessons, settings, and progress',()=>{const s=initialState(),t=new Terminal(s);s.started=true;bridge(s,t);s.checkpoint=2;s.hints.signal=2;s.settings.reducedMotion=true;t.run('cd /opt/bridge');expect(restore(JSON.stringify(s))).toEqual(s);});
 it.each([null,'not JSON','{}','null','[]','{"version":42}'])('recovers from corrupt or unsupported data %s',raw=>expect(restore(raw)).toEqual(initialState()));
 it('rejects malformed nested files, hints, checkpoints and missing directories',()=>{for(const mutate of [(s:State)=>delete s.fs['/opt'],(s:State)=>s.fs[SCRIPT].mode=999,(s:State)=>s.hints.signal=5,(s:State)=>s.checkpoint=99,(s:State)=>s.cwd='/nonexistent']){const s=initialState();mutate(s);expect(restore(JSON.stringify(s))).toEqual(initialState());}});
 it('reconstructs world completion from durable mission evidence',()=>{const s=initialState(),t=new Terminal(s);bridge(s,t);s.completed=[];expect(restore(JSON.stringify(s)).completed).toEqual(['signal','bridge']);});
 it('cannot fabricate completion flags without mission evidence',()=>{const s=initialState();s.completed=['signal','bridge','service'];s.checkpoint=3;s.finished=true;const r=restore(JSON.stringify(s));expect(r.completed).toEqual([]);expect(r.checkpoint).toBe(0);expect(r.finished).toBe(false);});
});

describe('durable learning progress',()=>{
 it('keeps earned restoration when a learner experiments with a bad config later',()=>{const s=initialState(),t=new Terminal(s);bridge(s,t);s.fs[SERVICE_CONFIG].content='PORT=443';t.run('systemctl restart beacon');s.fs[SERVICE_CONFIG].content='PORT=invalid';t.run('systemctl restart beacon');const restored=restore(JSON.stringify(s));expect(restored.completed).toEqual(['signal','bridge','service']);expect(restored.service).toBe('failed');expect(restored.journal).toContain('journalctl -u');});
});
