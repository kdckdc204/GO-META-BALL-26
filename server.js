const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const rooms = new Map();
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};

function code(){let c; do c=crypto.randomBytes(3).toString('hex').toUpperCase(); while(rooms.has(c)); return c;}
function send(ws,msg){if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg));}
function broadcast(room,msg){room.players.forEach(p=>send(p.ws,msg));}
function state(room){return {roomCode:room.code, status:room.status, players:room.players.map(p=>({id:p.id,side:p.side,name:p.name,team:p.team,tactic:p.tactic,ready:p.ready,connected:p.ws.readyState===WebSocket.OPEN})), minute:room.minute, score:room.score, commentary:room.commentary.slice(0,30)};}
function emitState(room){broadcast(room,{type:'state',state:state(room)});}
function commentary(room,text){room.commentary.unshift({minute:room.minute,text}); broadcast(room,{type:'commentary',minute:room.minute,text});}
function getPlayer(room,id){return room.players.find(p=>p.id===id);}
function resetMatch(room){room.minute=0;room.score=[0,0];room.status='playing';room.commentary=[];clearInterval(room.timer);room.timer=setInterval(()=>tick(room),650); commentary(room,'경기 시작! 양 팀이 포메이션을 정비합니다.'); emitState(room);}
const events=['중원에서 팽팽한 볼 다툼이 이어집니다.','측면으로 빠르게 전개합니다.','수비 뒷공간을 노리는 패스!','강한 압박으로 공을 빼앗았습니다.','페널티 박스 근처까지 전진합니다.','강력한 슈팅! 골키퍼가 선방합니다.','코너킥을 얻어냅니다.','위험한 크로스가 올라옵니다.','수비수가 몸을 던져 막아냅니다.','중거리 슈팅! 아쉽게 빗나갑니다.'];
function tick(room){
  if(room.status!=='playing') return;
  room.minute++;
  const a=room.players[0], b=room.players[1];
  if(Math.random()<0.52) commentary(room,events[Math.floor(Math.random()*events.length)]);
  const atkA=a?.tactic?.attackPower||50, defB=b?.tactic?.defensePower||50;
  const atkB=b?.tactic?.attackPower||50, defA=a?.tactic?.defensePower||50;
  if(a&&b){
    const pa=0.012+Math.max(0,atkA-defB)*0.00035;
    const pb=0.012+Math.max(0,atkB-defA)*0.00035;
    if(Math.random()<pa){room.score[0]++;commentary(room,`⚽ GOAL! ${a.name}의 팀이 득점합니다!`);}
    if(Math.random()<pb){room.score[1]++;commentary(room,`⚽ GOAL! ${b.name}의 팀이 득점합니다!`);}
  }
  broadcast(room,{type:'match_tick',minute:room.minute,score:room.score});
  if(room.minute>=90){room.status='finished';clearInterval(room.timer);commentary(room,`경기 종료! ${room.score[0]}-${room.score[1]}로 경기가 끝났습니다.`);emitState(room);}
}

const server=http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/') u='/index.html';
  const file=path.normalize(path.join(ROOT,u));
  if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');} res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});res.end(data);});
});
const wss=new WebSocket.Server({server});
wss.on('connection',ws=>{
  const id=crypto.randomUUID(); let room=null;
  send(ws,{type:'hello',id});
  ws.on('message',raw=>{
    let m; try{m=JSON.parse(raw);}catch{return;}
    if(m.type==='create'){
      if(room)return; const r={code:code(),status:'waiting',players:[],minute:0,score:[0,0],commentary:[],timer:null};
      const p={id,ws,side:0,name:(m.name||'HOST').slice(0,16),team:null,tactic:null,ready:false}; r.players.push(p);rooms.set(r.code,r);room=r; send(ws,{type:'room_created',code:r.code}); emitState(r); return;
    }
    if(m.type==='join'){
      if(room)return; const r=rooms.get(String(m.code||'').toUpperCase());
      if(!r)return send(ws,{type:'error',message:'방을 찾을 수 없습니다.'});
      if(r.players.length>=2)return send(ws,{type:'error',message:'방이 가득 찼습니다.'});
      const p={id,ws,side:1,name:(m.name||'GUEST').slice(0,16),team:null,tactic:null,ready:false};r.players.push(p);room=r;send(ws,{type:'joined',code:r.code});emitState(r);return;
    }
    if(!room)return send(ws,{type:'error',message:'먼저 방을 만들거나 참가하세요.'});
    const p=getPlayer(room,id); if(!p)return;
    if(m.type==='set_name')p.name=String(m.name||'PLAYER').slice(0,16);
    if(m.type==='set_team')p.team=m.team;
    if(m.type==='set_tactic')p.tactic=m.tactic;
    if(m.type==='ready'){
      if(!p.team)return send(ws,{type:'error',message:'먼저 팀을 선택하세요.'});
      if(!p.tactic)return send(ws,{type:'error',message:'먼저 공격/수비 전술을 선택하세요.'});
      p.ready=!!m.value;
      if(room.players.length===2&&room.players.every(x=>x.ready)&&room.status!=='playing') resetMatch(room);
    }
    if(m.type==='quick_tactic'){
      if(!p.tactic)p.tactic={}; p.tactic.quick=m.category;
      commentary(room,`${p.name}이(가) ${m.category} 전술을 지시했습니다.`);
    }
    if(m.type==='leave'){try{ws.close();}catch{}}
    emitState(room);
  });
  ws.on('close',()=>{
    if(!room)return; const idx=room.players.findIndex(p=>p.id===id); if(idx>=0)room.players.splice(idx,1);
    if(room.status==='playing'){room.status='finished';clearInterval(room.timer);commentary(room,'상대방의 연결이 종료되어 경기가 끝났습니다.');}
    if(room.players.length===0){clearInterval(room.timer);rooms.delete(room.code);} else emitState(room);
  });
});
server.listen(PORT,()=>console.log(`GO META BALL 2026 listening on ${PORT}`));
