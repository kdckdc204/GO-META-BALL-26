let selectedTeam=null, selectedTactic=null, socket=null, myId=null, roomCode=null, mySide=null, gameState=null;
const $=id=>document.getElementById(id);
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');window.scrollTo(0,0);startBGM();}
function startBGM(){const a=$('bgm');a.volume=.42;a.play().catch(()=>{});}
document.addEventListener('click',()=>startBGM(),{once:true});
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1800)}
function connect(){if(socket&&socket.readyState===WebSocket.OPEN)return;socket=new WebSocket('https://go-meta-ball-2026.onrender.com/');socket.onmessage=e=>handle(JSON.parse(e.data));socket.onclose=()=>toast('서버 연결 종료.');}
function send(type,data={}){if(!socket||socket.readyState!==WebSocket.OPEN)return toast('서버 연결 중입니다.');socket.send(JSON.stringify({type,...data}));}
function createRoom(){connect();setTimeout(()=>send('create',{name:$('playerName')?.value||'HOST'}),150)}
function joinRoom(){const c=$('joinCode').value.trim().toUpperCase();if(c.length!==6)return toast('6자리 방 코드를 입력하세요.');connect();setTimeout(()=>send('join',{code:c,name:$('playerName')?.value||'GUEST'}),150)}
function handle(m){
 if(m.type==='hello'){myId=m.id;return}
 if(m.type==='error')return toast(m.message);
 if(m.type==='room_created'||m.type==='joined'){roomCode=m.code||roomCode;showScreen('teams');toast('온라인 방에 연결되었습니다.');}
 if(m.type==='state'){gameState=m.state;renderOnlineState();}
 if(m.type==='commentary')addCommentary(m.text,m.minute);
 if(m.type==='match_tick'){updateScore(m.score,m.minute);}
}
function renderOnlineState(){if(!gameState)return;const me=gameState.players.find(p=>p.id===myId);mySide=me?.side??0;const rival=gameState.players.find(p=>p.id!==myId);$('onlineRoom').textContent=gameState.roomCode;$('roomStatus').textContent=gameState.players.length<2?'친구가 들어오길 기다리는 중…':(gameState.status==='playing'?'경기 진행 중':'두 명 모두 READY 하면 경기 시작');if(me?.team){selectedTeam=TEAMS.find(t=>t[1]===me.team);$('selectedTeamTitle').textContent=selectedTeam?.[0]||'팀';} if(rival)$('rivalInfo').textContent=`상대: ${rival.name} · ${rival.team||'팀 미선택'}`;if(gameState.status==='playing'){showScreen('match');$('homeTeam').textContent=gameState.players[0]?.team||'HOME';$('awayTeam').textContent=gameState.players[1]?.team||'AWAY';}}
function renderTeams(){$('teamGrid').innerHTML=TEAMS.map(t=>`<div class="team-card ${selectedTeam?.[1]===t[1]?'selected':''}" onclick="selectTeam('${t[1]}')"><div class="team-logo">${t[2]}</div><strong>${t[0]}</strong><small>${t[1]} · EPL</small></div>`).join('')}
function selectTeam(code){selectedTeam=TEAMS.find(t=>t[1]===code);send('set_team',{team:code});$('selectedTeamTitle').textContent=selectedTeam[0];showScreen('squad');renderSquad(code);}
function renderSquad(code){let list=SQUADS[code]||['Goalkeeper','Right Back','Centre Back','Centre Back','Left Back','Defensive Midfielder','Central Midfielder','Right Winger','Attacking Midfielder','Left Winger','Striker'];$('squadList').innerHTML=list.map((p,i)=>`<div class="player-row"><span>${i+1}. ${p}</span><span>${['GK','RB','CB','CB','LB','DM','CM','RW','AM','LW','ST'][i]}</span></div>`).join('');}
function renderTactics(type,btn){document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');$('tacticsGrid').innerHTML=TACTICS[type].map((x,i)=>`<div class="tactic ${selectedTactic?.name===x[0]?'selected':''}" onclick="selectTactic(this,'${x[0]}','${type}',${i})"><b>${i+1}. ${x[0]}</b><p>${x[1]}</p></div>`).join('')}
function power(type,i){return type==='attack'?58+(19-i):type==='defense'?58+(19-i):60;}
function selectTactic(el,name,type,i){document.querySelectorAll('.tactic').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');selectedTactic={name,type,attackPower:type==='attack'?power(type,i):50,defensePower:type==='defense'?power(type,i):50};send('set_tactic',{tactic:selectedTactic});toast('전술 선택: '+name)}
function readyMatch(){if(!selectedTeam)return toast('팀을 먼저 선택하세요.');if(!selectedTactic)return toast('전술을 선택하세요.');send('ready',{value:true});toast('READY! 상대를 기다립니다.');}
function startMatch(){readyMatch();}
function updateScore(score,minute){$('homeScore').textContent=score[0];$('awayScore').textContent=score[1];$('minute').textContent=String(minute).padStart(2,'0');}
function addCommentary(t,m=0){const d=document.createElement('div');d.className='commentary-line';d.innerHTML=`<time>${String(m).padStart(2,'0')}'</time>${t}`;$('commentaryLog').prepend(d);$('matchEvent').textContent=t;}
function quickTactic(type){send('quick_tactic',{category:type});toast(type+' 전술 변경 지시');}
function endMatch(){send('leave');showScreen('home');toast('방에서 나갔습니다.');}
function copyRoom(){navigator.clipboard?.writeText(roomCode||$('onlineRoom').textContent||'');toast('방 코드가 복사되었습니다.');}
renderTeams();renderTactics('attack',document.querySelector('.tab'));connect();
