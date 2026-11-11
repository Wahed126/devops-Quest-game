import { createServer } from 'vite';
import { spawn } from 'node:child_process';
const server=await createServer({server:{host:'127.0.0.1',port:0,strictPort:true}});
try {
 await server.listen();
 for(const file of ['tests/fonts.mjs','tests/browser.mjs']){
  const code=await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,QUEST_BASE_URL:`http://127.0.0.1:${server.httpServer.address().port}`}});
   child.on('error',reject);child.on('exit',resolve);
  });
  if(code!==0)throw new Error(`${file} failed with exit code ${code}`);
 }
}finally{await server.close();}
