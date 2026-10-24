(() => {
  "use strict";
  const $=id=>document.getElementById(id),page=document.body.dataset.page;

  // Self-contained math helpers. The game no longer depends on ../../shared/mmq-math.js.
  const shared=window.MMQMath||{};
  const fallbackMath={
    choice(arr){return Array.isArray(arr)&&arr.length?arr[Math.floor(Math.random()*arr.length)]:null},
    tableFacts(tables,max=9){
      const out=[];
      (Array.isArray(tables)?tables:[]).forEach(table=>{
        const b=Number(table);
        if(!Number.isFinite(b))return;
        for(let a=1;a<=max;a++)out.push({a,b,product:a*b});
      });
      return out.length?out:[{a:1,b:2,product:2}];
    },
    completedLines(selected,size=5){
      const set=selected instanceof Set?selected:new Set(selected||[]),lines=[];
      for(let r=0;r<size;r++){
        let ok=true;for(let c=0;c<size;c++)if(!set.has(r*size+c)){ok=false;break}
        if(ok)lines.push(`row-${r}`);
      }
      for(let c=0;c<size;c++){
        let ok=true;for(let r=0;r<size;r++)if(!set.has(r*size+c)){ok=false;break}
        if(ok)lines.push(`col-${c}`);
      }
      return lines;
    }
  };
  const M={
    choice(arr){try{return typeof shared.choice==='function'?shared.choice(arr):fallbackMath.choice(arr)}catch(_){return fallbackMath.choice(arr)}},
    tableFacts(tables,max){try{const v=typeof shared.tableFacts==='function'?shared.tableFacts(tables,max):fallbackMath.tableFacts(tables,max);return Array.isArray(v)&&v.length?v:fallbackMath.tableFacts(tables,max)}catch(_){return fallbackMath.tableFacts(tables,max)}},
    completedLines(selected,size){try{const v=typeof shared.completedLines==='function'?shared.completedLines(selected,size):fallbackMath.completedLines(selected,size);return Array.isArray(v)?v:fallbackMath.completedLines(selected,size)}catch(_){return fallbackMath.completedLines(selected,size)}}
  };
  const LANG_KEY="mmq_board_lang",SETTINGS_KEY="mmq_board_settings",CURRENT_KEY="mmq_board_current",HISTORY_KEY="mmq_board_history";
  const safeGet=k=>{try{return localStorage.getItem(k)}catch(_){return null}},safeSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
  const readJSON=(k,fallback)=>{try{const v=JSON.parse(safeGet(k)||"");return v??fallback}catch(_){return fallback}};
  const queryLang=(new URLSearchParams(location.search).get("lang")||"").toLowerCase();if(queryLang) safeSet(LANG_KEY,queryLang.startsWith("zh")?"zh":"en");
  let lang=safeGet(LANG_KEY)==="zh"?"zh":"en";
  const T={
    en:{home:"MMQ! Home",stage:"Fluency Reinforcement",appTitle:"Multiplication Board",menuSubtitle:"A friendly two-player retrieval challenge.",language:"Language",players:"Players",player1:"Player 1",player2:"Player 2",how:"How to play",rule1:"Take turns answering multiplication questions.",rule2:"Tap the correct answer on your own board.",rule3:"Complete three full rows or columns to win.",chooseTables:"Choose 1–8 times tables",selected:n=>`Selected: ${n}/8`,clear:"Clear",scoreboard:"Scoreboard",history:"History",start:"Start game",needTable:"Choose at least one times table.",maxThree:"You can choose up to all eight times tables (×2–×9).",backMenu:"Back to menu",ready:"Ready?",pressStart:"Press Start to begin.",tablesLabel:t=>`Tables: ${t}`,turn:n=>`${n}'s turn`,question:(n,a,b)=>`${n}: ${a} × ${b} = ?`,lines:n=>`Lines: ${n}/3`,ownBoard:"Use your own board.",correct:(bonus)=>`Correct! +10 and +${bonus} time bonus.`,wrong:"Not this one. No points lost.",timeUp:"Time's up. Next player.",handover:n=>`Pass the device to ${n}`,winner:n=>`${n} completed three lines!`,noCells:"No answer spaces remain. The game will finish.",gameOver:"Game over!",resultSubtitle:"Great practice. Check the scores below.",tie:"It's a tie!",wins:n=>`${n} wins!`,playAgain:"Play again",topScores:"Top 10 scores saved on this device.",search:"Search player",rank:"Rank",player:"Player",score:"Score",tables:"Tables",noScores:"No scores yet.",historySubtitle:"Matches saved on this device.",date:"Date",noHistory:"No matches yet.",clearHistory:"Clear history",confirmClear:"Clear all saved board-game history?",allTables:"All tables",mixed:"Mixed",tableN:n=>`×${n}`,cleared:"History cleared.",mixedFilterNote:"Games using 2–8 times tables are grouped under Mixed only."},
    zh:{home:"MMQ! 主页",stage:"熟练度巩固",appTitle:"乘法棋盘",menuSubtitle:"两人轮流进行乘法提取练习。",language:"语言",players:"玩家",player1:"玩家 1",player2:"玩家 2",how:"玩法",rule1:"两位玩家轮流回答乘法题。",rule2:"只在自己的棋盘点击正确答案。",rule3:"完成三条完整横线或直线即可获胜。",chooseTables:"选择 1–8 个乘法表",selected:n=>`已选择：${n}/8`,clear:"清除",scoreboard:"排行榜",history:"记录",start:"开始游戏",needTable:"请至少选择一个乘法表。",maxThree:"最多可选择全部八个乘法表（×2–×9）。",backMenu:"返回菜单",ready:"准备好了吗？",pressStart:"点击“开始游戏”。",tablesLabel:t=>`乘法表：${t}`,turn:n=>`轮到 ${n}`,question:(n,a,b)=>`${n}：${a} × ${b} = ?`,lines:n=>`连线：${n}/3`,ownBoard:"请在自己的棋盘作答。",correct:bonus=>`答对！+10 分，再加 ${bonus} 时间奖励分。`,wrong:"答案不对，不扣分。",timeUp:"时间到，轮到下一位。",handover:n=>`请把设备交给 ${n}`,winner:n=>`${n} 完成三条连线！`,noCells:"没有可用答案格了，游戏结束。",gameOver:"游戏结束！",resultSubtitle:"练习完成，看看两位玩家的分数。",tie:"平手！",wins:n=>`${n} 获胜！`,playAgain:"再玩一次",topScores:"本设备保存的最高 10 个分数。",search:"搜索玩家",rank:"排名",player:"玩家",score:"分数",tables:"乘法表",noScores:"还没有分数记录。",historySubtitle:"本设备保存的对战记录。",date:"日期",noHistory:"还没有对战记录。",clearHistory:"清除记录",confirmClear:"确定清除所有棋盘游戏记录吗？",allTables:"全部乘法表",mixed:"混合",tableN:n=>`×${n}`,cleared:"记录已清除。",mixedFilterNote:"选择 2–8 个乘法表的游戏只归类在“混合”中。"}
  };const tr=()=>T[lang];
  function applyI18n(){document.documentElement.lang=lang==="zh"?"zh-Hans":"en-GB";document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(typeof tr()[k]==="string")el.textContent=tr()[k]});document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{const k=el.dataset.i18nPlaceholder;if(typeof tr()[k]==="string")el.placeholder=tr()[k]});const sel=$("langSelect");if(sel)sel.value=lang;const home=$("homeLink");if(home)home.href=lang==="zh"?"../../START_HERE_ZH_CN.html":"../../START_HERE_EN_GB.html";document.title=`${tr().appTitle} • ${page||"MMQ"}`;if(page==="menu")syncMenuText();if(page==="game")syncGameText();if(page==="scoreboard"||page==="history"){fillFilter();renderData()}if(page==="result")renderResult()}
  function setLang(v){lang=v==="zh"?"zh":"en";safeSet(LANG_KEY,lang);applyI18n()}
  function settings(){const s=readJSON(SETTINGS_KEY,{});return{p1:String(s.p1||tr().player1).slice(0,20),p2:String(s.p2||tr().player2).slice(0,20),tables:Array.isArray(s.tables)?s.tables.map(Number).filter(n=>n>=2&&n<=9).slice(0,8):[]}}
  function tableLabel(arr){const list=(arr||[]).map(n=>`×${n}`).join(lang==="zh"?"、":", ");return list||"—"}
  function makeSessionId(){return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`}

  // MENU
  let menuSelected=[];
  function initMenu(){const s=settings();menuSelected=s.tables.slice();$("p1Name").value=s.p1==="Player 1"&&lang==="zh"?tr().player1:s.p1;$("p2Name").value=s.p2==="Player 2"&&lang==="zh"?tr().player2:s.p2;const box=$("tablePicker");box.innerHTML="";for(let n=2;n<=9;n++){const b=document.createElement("button");b.type="button";b.className="table-pick";b.dataset.table=n;b.textContent=`×${n}`;b.addEventListener("click",()=>{if(menuSelected.includes(n))menuSelected=menuSelected.filter(x=>x!==n);else if(menuSelected.length<8)menuSelected.push(n);else{popup(tr().maxThree);return}syncMenuUI()});box.appendChild(b)}$("clearTables").addEventListener("click",()=>{menuSelected=[];syncMenuUI()});const start=$("startBtn");if(start){start.addEventListener("click",e=>{e.preventDefault();startFromMenu()});}$("scoreboardBtn").addEventListener("click",()=>location.href="scoreboard.html");$("historyBtn").addEventListener("click",()=>location.href="history.html");syncMenuUI();}
  function syncMenuUI(){document.querySelectorAll(".table-pick").forEach(b=>b.classList.toggle("selected",menuSelected.includes(Number(b.dataset.table))));$("selectedCount").textContent=tr().selected(menuSelected.length);const start=$("startBtn");if(start){const ready=menuSelected.length>0;start.classList.toggle("is-not-ready",!ready);start.setAttribute("aria-disabled",String(!ready));}}
  function syncMenuText(){if($("selectedCount"))syncMenuUI()}
  function startFromMenu(){if(!menuSelected.length){popup(tr().needTable);return}const p1=$("p1Name").value.trim()||tr().player1,p2=$("p2Name").value.trim()||tr().player2;const s={p1,p2,tables:menuSelected.slice()};safeSet(SETTINGS_KEY,JSON.stringify(s));safeSet(CURRENT_KEY,JSON.stringify({id:makeSessionId(),startedAt:new Date().toISOString(),...s,score1:0,score2:0,winner:null,ended:false}));location.href="game.html"}

  // GAME
  let gameStarted=false,currentPlayer=1,score1=0,score2=0,timeLeft=15,timerId=null,intermissionId=null,blocked=false,currentAnswer=0,currentFact=null,boards={1:[],2:[]},selected={1:new Set(),2:new Set()},lineSets={1:new Set(),2:new Set()};
  function initGame(){const s=settings();if(!s.tables.length){s.tables=[2];safeSet(SETTINGS_KEY,JSON.stringify(s))}$("p1Label").textContent=s.p1;$("p2Label").textContent=s.p2;$("tablesText").textContent=tr().tablesLabel(tableLabel(s.tables));createBoard(1,s.tables);createBoard(2,s.tables);$("startGameBtn").addEventListener("click",startGame);$("menuBtn").addEventListener("click",()=>location.href="menu.html");syncGameText()}
  function createBoard(player,tables){const el=$(`board${player}`);el.innerHTML="";boards[player]=[];selected[player]=new Set();lineSets[player]=new Set();const facts=M.tableFacts(tables,9);for(let i=0;i<25;i++){const fact=M.choice(facts)||{a:1,b:2,product:2};boards[player].push({...fact});const b=document.createElement("button");b.type="button";b.className="cell";b.textContent=String(fact.product);b.dataset.index=i;b.addEventListener("click",()=>chooseCell(player,i,b));el.appendChild(b)}}
  function startGame(){if(gameStarted)return;gameStarted=true;score1=0;score2=0;currentPlayer=1;blocked=false;$("startGameBtn").disabled=true;updateScores();newQuestion()}
  function currentName(){const s=settings();return currentPlayer===1?s.p1:s.p2}
  function syncGameText(){if(page!=="game")return;const s=settings();if($("p1Label"))$("p1Label").textContent=s.p1;if($("p2Label"))$("p2Label").textContent=s.p2;if($("tablesText"))$("tablesText").textContent=tr().tablesLabel(tableLabel(s.tables));updateScores();if(!gameStarted&&$("turnMessage"))$("turnMessage").textContent=tr().pressStart}
  function availableIndexes(player){return boards[player].map((_,i)=>i).filter(i=>!selected[player].has(i))}
  function newQuestion(){if(!gameStarted)return;blocked=false;const available=availableIndexes(currentPlayer);if(!available.length){popup(tr().noCells);finishGame();return}const idx=M.choice(available);currentFact=boards[currentPlayer][idx];currentAnswer=currentFact.product;$("question").textContent=tr().question(currentName(),currentFact.a,currentFact.b);$("turnMessage").textContent=tr().turn(currentName());setActivePlayer();startTimer()}
  function startTimer(){clearInterval(timerId);timeLeft=15;$("timer").textContent=timeLeft;timerId=setInterval(()=>{timeLeft--;$("timer").textContent=timeLeft;if(timeLeft<=0){clearInterval(timerId);popup(tr().timeUp);nextTurn()}},1000)}
  function chooseCell(player,index,button){if(!gameStarted||blocked)return;if(player!==currentPlayer){popup(tr().ownBoard);return}if(selected[player].has(index))return;clearInterval(timerId);const value=boards[player][index].product;if(value===currentAnswer){selected[player].add(index);button.classList.add("selected");const bonus=Math.max(0,timeLeft);if(player===1)score1+=10+bonus;else score2+=10+bonus;popup(tr().correct(bonus));updateLines(player);updateScores();if(lineSets[player].size>=3){if(player===1)score1+=100;else score2+=100;updateScores();popup(tr().winner(currentName()));blocked=true;setTimeout(finishGame,1200);return}}else popup(tr().wrong);nextTurn()}
  function updateLines(player){const lines=M.completedLines(selected[player],5);lineSets[player]=new Set(lines);const cells=[...$(`board${player}`).querySelectorAll(".cell")];cells.forEach(c=>c.classList.remove("line"));lines.forEach(line=>{const [type,numRaw]=line.split("-");const n=Number(numRaw);if(type==="row")for(let c=0;c<5;c++)cells[n*5+c].classList.add("line");else for(let r=0;r<5;r++)cells[r*5+n].classList.add("line")});$(`p${player}Lines`).textContent=tr().lines(lines.length)}
  function updateScores(){if($("p1Score"))$("p1Score").textContent=score1;if($("p2Score"))$("p2Score").textContent=score2;if($("p1Lines"))$("p1Lines").textContent=tr().lines(lineSets[1]?.size||0);if($("p2Lines"))$("p2Lines").textContent=tr().lines(lineSets[2]?.size||0);setActivePlayer()}
  function setActivePlayer(){if(!$("player1Panel"))return;$("player1Panel").classList.toggle("active",gameStarted&&currentPlayer===1);$("player2Panel").classList.toggle("active",gameStarted&&currentPlayer===2)}
  function nextTurn(){if(blocked)return;blocked=true;clearInterval(timerId);currentPlayer=currentPlayer===1?2:1;const name=currentName(),overlay=$("intermission");overlay.classList.add("show");$("handoverText").textContent=tr().handover(name);let n=2;$("handoverCount").textContent=n;clearInterval(intermissionId);intermissionId=setInterval(()=>{n--;$("handoverCount").textContent=n;if(n<=0){clearInterval(intermissionId);overlay.classList.remove("show");blocked=false;newQuestion()}},1000)}
  function finishGame(){if(!gameStarted)return;gameStarted=false;blocked=true;clearInterval(timerId);clearInterval(intermissionId);$("intermission")?.classList.remove("show");const s=settings(),cur=readJSON(CURRENT_KEY,{}),winner=score1===score2?"tie":(score1>score2?s.p1:s.p2);const final={id:cur.id||makeSessionId(),startedAt:cur.startedAt||new Date().toISOString(),endedAt:new Date().toISOString(),p1:s.p1,p2:s.p2,tables:s.tables,score1,score2,winner,ended:true};safeSet(CURRENT_KEY,JSON.stringify(final));location.href="result.html"}

  // RESULT
  function initResult(){$("againBtn").addEventListener("click",()=>location.href="menu.html");$("scoreboardBtn").addEventListener("click",()=>location.href="scoreboard.html");$("historyBtn").addEventListener("click",()=>location.href="history.html");saveResultOnce();renderResult()}
  function saveResultOnce(){const cur=readJSON(CURRENT_KEY,null);if(!cur||!cur.ended||!cur.id)return;const hist=readJSON(HISTORY_KEY,[]);if(!hist.some(h=>h.id===cur.id)){hist.push(cur);safeSet(HISTORY_KEY,JSON.stringify(hist.slice(-100)))}}
  function renderResult(){if(page!=="result")return;const cur=readJSON(CURRENT_KEY,null),s=settings();const p1=cur?.p1||s.p1,p2=cur?.p2||s.p2,s1=Number(cur?.score1||0),s2=Number(cur?.score2||0);$("rP1").textContent=p1;$("rP2").textContent=p2;$("rS1").textContent=s1;$("rS2").textContent=s2;$("winnerText").textContent=s1===s2?tr().tie:tr().wins(s1>s2?p1:p2)}

  // SCOREBOARD / HISTORY
  function history(){const h=readJSON(HISTORY_KEY,[]);return Array.isArray(h)?h:[]}
  function fillFilter(){const sel=$("tableFilter");if(!sel)return;const current=sel.value||"all";sel.innerHTML="";const add=(value,text)=>{const o=document.createElement("option");o.value=value;o.textContent=text;sel.appendChild(o)};add("all",tr().allTables);add("mixed",tr().mixed);for(let n=2;n<=9;n++)add(String(n),tr().tableN(n));sel.value=[...sel.options].some(o=>o.value===current)?current:"all"}
  function matchFilter(entry,search,filter){
    const names=`${entry.p1||""} ${entry.p2||""}`.toLowerCase();
    const tables=Array.isArray(entry.tables)?entry.tables.map(Number).filter(Number.isFinite):[];
    const nameMatch=!search||names.includes(search);
    if(!nameMatch)return false;
    if(filter==="all")return true;
    // Exclusive category rule:
    // 1 selected table -> only that specific table category.
    // 2–8 selected tables -> Mixed only, never repeated under individual tables.
    if(filter==="mixed")return tables.length>1;
    return tables.length===1&&tables[0]===Number(filter);
  }
  function initDataPage(){fillFilter();$("searchPlayer").addEventListener("input",renderData);$("tableFilter").addEventListener("change",renderData);if(page==="scoreboard")$("historyBtn").addEventListener("click",()=>location.href="history.html");else{$("scoreboardBtn").addEventListener("click",()=>location.href="scoreboard.html");$("clearHistory").addEventListener("click",()=>{if(confirm(tr().confirmClear)){safeSet(HISTORY_KEY,"[]");renderData();popup(tr().cleared)}})}renderData()}
  function cell(text){const td=document.createElement("td");td.textContent=text;return td}
  function renderData(){if(page!=="scoreboard"&&page!=="history")return;const search=($("searchPlayer")?.value||"").trim().toLowerCase(),filter=$("tableFilter")?.value||"all",h=history().filter(e=>matchFilter(e,search,filter));if(page==="scoreboard"){const flat=[];h.forEach(e=>{flat.push({name:e.p1,score:Number(e.score1)||0,tables:e.tables});flat.push({name:e.p2,score:Number(e.score2)||0,tables:e.tables})});flat.sort((a,b)=>b.score-a.score);const body=$("scoreRows");body.innerHTML="";flat.slice(0,10).forEach((e,i)=>{const r=document.createElement("tr");if(i<3)r.classList.add(`rank-${i+1}`);const rankTd=document.createElement("td");rankTd.className="rank-cell";const rankPill=document.createElement("span");rankPill.className="rank-pill";rankPill.textContent=String(i+1);rankTd.appendChild(rankPill);const nameTd=document.createElement("td");const namePill=document.createElement("span");namePill.className="name-pill";namePill.textContent=String(e.name||"");nameTd.appendChild(namePill);const scoreTd=document.createElement("td");scoreTd.className="score-cell";const scorePill=document.createElement("span");scorePill.className="score-pill";scorePill.textContent=String(e.score);scoreTd.appendChild(scorePill);const tableTd=document.createElement("td");const tablePill=document.createElement("span");tablePill.className="table-pill";tablePill.textContent=tableLabel(e.tables);tableTd.appendChild(tablePill);r.append(rankTd,nameTd,scoreTd,tableTd);body.appendChild(r)});$("scoreEmpty").classList.toggle("hidden",flat.length>0)}else{const body=$("historyRows");body.innerHTML="";h.slice().reverse().forEach(e=>{const r=document.createElement("tr");const d=e.endedAt||e.startedAt;let date="";try{date=new Date(d).toLocaleString(lang==="zh"?"zh-CN":"en-GB")}catch(_){date=String(d||"")}r.append(cell(date),cell(String(e.p1||"")),cell(String(e.score1||0)),cell(String(e.p2||"")),cell(String(e.score2||0)),cell(tableLabel(e.tables)));body.appendChild(r)});$("historyEmpty").classList.toggle("hidden",h.length>0)}}

  function popup(msg){document.querySelectorAll(".popup").forEach(x=>x.remove());const p=document.createElement("div");p.className="popup";p.textContent=msg;document.body.appendChild(p);setTimeout(()=>p.remove(),1900)}
  const langSel=$("langSelect");if(langSel)langSel.addEventListener("change",()=>setLang(langSel.value));
  applyI18n();if(page==="menu")initMenu();if(page==="game")initGame();if(page==="result")initResult();if(page==="scoreboard"||page==="history")initDataPage();
})();
