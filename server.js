// Hoshizora Living Days — optional AI backend
// Node.js 18+ recommended. Keep OPENAI_API_KEY on the server only.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const API_KEY = process.env.OPENAI_API_KEY;
const ROOT = process.cwd();

const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8" };
function send(res,status,body,type="application/json; charset=utf-8"){res.writeHead(status,{"Content-Type":type,"Access-Control-Allow-Origin":"*"});res.end(typeof body==="string"?body:JSON.stringify(body));}
async function readBody(req){let s="";for await(const c of req)s+=c;return JSON.parse(s||"{}");}

const server=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type"});return res.end();}
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname==="/api/health")return send(res,200,{ok:true,aiConfigured:Boolean(API_KEY),model:MODEL});
  if(url.pathname==="/api/turn"&&req.method==="POST"){
    res.setHeader("Cache-Control","no-store");
    if(!API_KEY)return send(res,503,{error:"OPENAI_API_KEY belum diatur pada server. AI wajib dikonfigurasi; tidak ada mode lokal."});
    try{
      const data=await readBody(req);
      const instructions=`Kamu adalah AI Story Director untuk game life-simulation RPG Hoshizora, berlatar kota pesisir Jepang modern. Balas HANYA JSON valid, tanpa markdown, dengan bentuk:
{"minutes":30,"narration":"narasi singkat orang kedua dalam Bahasa Indonesia","npcResponse":"respons NPC bila relevan, jika tidak string kosong","eventTitle":"judul event atau string kosong","choices":["pilihan opsional"],"statChanges":{"academic":0,"athletic":0,"social":0,"charm":0,"confidence":0,"discipline":0,"energy":0,"stress":0},"moneyChange":0,"location":null}
Aturan: jangan memutuskan niat pemain di luar tindakan yang diminta; jangan membuat pemain otomatis dikenal NPC yang belum ditemui; jangan memaksakan romance; NPC punya agensi, rutinitas, batasan, dan ingatan; dunia bereaksi secara masuk akal. Tidak ada plot armor, tetapi jangan menciptakan bahaya ekstrem secara sembarangan. Jangan mengarang hasil uang yang tidak masuk akal. Durasi biasanya 5–60 menit untuk tindakan kecil, lebih lama untuk kegiatan panjang, maksimum 240 menit per respons. Stat changes kecil dan masuk akal, umumnya antara -5 dan +5. moneyChange harus sesuai transaksi yang jelas. location hanya boleh berupa ID lokasi yang ada atau null. Jangan mengubah data selain field respons yang diminta. Jika aksi ambigu, narasikan upaya yang wajar dan berikan satu pertanyaan/opsi lanjutan dalam choices. Selalu jaga kontinuitas berdasarkan data yang diberikan.`;
      const input={action:data.action,player:data.player,world:data.world,npcs:data.npcs,recentEvents:data.recentEvents,npcId:data.npcId,validLocationIds:["school","library","citypark","conbini","diner","busstop","beach","seasidepark","aquarium","harbor","icecream","seafood","station","mall","arcade","cinema","bookstore","cafe","karaoke","sakurapark","shrine","bakery","flower","residential","hospital","offices","hotel","minatorest","forest","lake","hiking","inn","home","street"]};
      const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,instructions,input:JSON.stringify(input),text:{format:{type:"json_object"}},max_output_tokens:700})});
      const payload=await response.json();
      if(!response.ok)return send(res,response.status,{error:payload.error?.message||"AI provider error"});
      const output=payload.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
      if(!output)return send(res,502,{error:"AI tidak mengembalikan teks JSON."});
      let parsed;try{parsed=JSON.parse(output)}catch{return send(res,502,{error:"Respons AI bukan JSON valid."})}
      return send(res,200,parsed);
    }catch(e){return send(res,400,{error:"Permintaan tidak valid atau backend gagal memprosesnya."});}
  }
  // Serve the static game files from the project directory.
  let path=url.pathname==="/"?"/index.html":decodeURIComponent(url.pathname);
  path=normalize(path).replace(/^(\.\.[/\\])+/, "");
  try{const full=join(ROOT,path);const bytes=await readFile(full);return send(res,200,bytes.toString(),mime[extname(full)]||"application/octet-stream");}
  catch{return send(res,404,"Not found","text/plain; charset=utf-8");}
});
server.listen(PORT,()=>console.log(`Hoshizora running at http://localhost:${PORT}`));
