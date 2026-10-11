const API_URL = "https://script.google.com/macros/s/AKfycbzdry7EEPkam7b3ErUXTEC7IQWq7r886KOgaZa6uHnLRA8PXm8uuuLGviJFizj94x6SmA/exec";

// 通用 API 發送函式
async function api(action, data) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ action: action }, data || {}))
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "api_error");
  return j;
}

/* ---------- index.html：登入頁邏輯 ---------- */
function initLogin() {
  // 如果已經登入過或選了訪客模式，直接跳轉到 main.html
  var auth = sessionStorage.getItem("tide-auth");
  var guest = sessionStorage.getItem("tide-guest");
  if (auth || guest) {
    location.href = "main.html";
    return;
  }

  var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function genCode() { 
    var r = crypto.getRandomValues(new Uint8Array(12)), t = ""; 
    r.forEach(function (x, i) { 
      t += A[x % 32]; 
      if (i % 4 === 3 && i < 11) t += "-"; 
    }); 
    return t; 
  }
  function norm(t) { return String(t).toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function $(id) { return document.getElementById(id); }

  var nickIn = $("nick"), codeIn = $("codein"), pend = null, newCode = "";

  function netErr(e) {
    if (e && e.name === "TypeError") return "連不到後端（" + e.message + "）：請確認網址正確，且部署的「誰可以存取」是「所有人」。";
    if (e && e.name === "SyntaxError") return "後端回傳的不是 JSON：多半是部署存取權不是「所有人」，或尚未授權。";
    return "後端回報錯誤：" + (e && e.message);
  }
  function gerr(t) { $("gerr").textContent = t; }
  function show(n) { ["st1", "stn", "sto"].forEach(function (i) { $(i).hidden = i !== n; }); gerr(""); }
  
  function done(nick, code) { 
    sessionStorage.setItem("tide-auth", JSON.stringify({ nick: nick, code: norm(code) })); 
    sessionStorage.removeItem("tide-guest");
    location.href = "main.html"; 
  }

  $("next").onclick = async function () {
    var v = nickIn.value.trim().slice(0, 20); 
    if (!v) { nickIn.focus(); return; }
    if (API_URL.indexOf("PASTE_YOUR") === 0) { gerr("尚未設定 API_URL：請把 Apps Script 的 /exec 網址貼到 main.js 開頭。"); return; }
    gerr("連線中…");
    try {
      var j = await api("checkNick", { nick: v });
      pend = v;
      if (j.exists) { $("on").textContent = v; codeIn.value = ""; show("sto"); codeIn.focus(); }
      else { newCode = genCode(); $("nn").textContent = v; $("newcode").textContent = newCode; $("saved").checked = false; show("stn"); }
    } catch (e) { console.error(e); gerr(netErr(e)); }
  };

  $("create").onclick = async function () {
    if (!$("saved").checked) { gerr("請先抄下安全碼並勾選。"); return; }
    try { await api("register", { nick: pend, code: norm(newCode) }); done(pend, newCode); }
    catch (e) { if (e.message === "taken") { show("st1"); gerr("這個暱稱剛被別人使用，請換一個。"); } else { console.error(e); gerr(netErr(e)); } }
  };

  $("unlock").onclick = async function () {
    gerr("驗證中…");
    try { await api("login", { nick: pend, code: norm(codeIn.value) }); done(pend, codeIn.value); }
    catch (e) { if (e.message === "auth") gerr("安全碼不正確。"); else { console.error(e); gerr(netErr(e)); } }
  };

  $("cpcode").onclick = function () { 
    try { 
      navigator.clipboard.writeText(newCode).then(function () { gerr("已複製。"); }, function () { gerr("請手動抄下安全碼。"); }); 
    } catch (e) { gerr("請手動抄下安全碼。"); } 
  };

  $("back1").onclick = $("back2").onclick = function () { show("st1"); };
  
  $("skip").onclick = function (e) { 
    e.preventDefault();
    sessionStorage.setItem("tide-guest", "1"); 
    sessionStorage.removeItem("tide-auth");
    location.href = "main.html";
  };

  nickIn.addEventListener("keydown", function (e) { if (e.key === "Enter") $("next").click(); });
  codeIn.addEventListener("keydown", function (e) { if (e.key === "Enter") $("unlock").click(); });
  nickIn.focus();
}

/* ---------- main.html：主頁邏輯 ---------- */
function initMain() {
  var authStr = sessionStorage.getItem("tide-auth");
  var guestStr = sessionStorage.getItem("tide-guest");

  // 門禁安全檢查：未登入且未選擇訪客模式，跳轉至登入頁
  if (!authStr && !guestStr) {
    location.href = "index.html";
    return;
  }

  var auth = null; 
  try { auth = JSON.parse(authStr || "null"); } catch (e) {}
  var nick = auth ? auth.nick : "";

  var F=[
    {n:"燈塔議會",m:"維護潮汐表與航道的官方組織",g:"讓所有島保持和平與貿易暢通。",w:"對遺物實行管制，私自拾取會被處罰。",h:"潮汐表出錯的真相，他們可能早就知道。"},
    {n:"鹽行會",m:"控制貿易與港口的商人聯盟",g:"賺錢，並壟斷遺物交易。",w:"出價高，也不問來源，但翻臉很快。",h:"想要一份沒有議會審查的潮汐表。"},
    {n:"深潮教團",m:"崇拜海中意志的信徒",g:"讓大海永遠不再退去。",w:"他們相信滿潮之夜是一種恩典。",h:"你的隊伍裡，也許有人已經受洗。"},
    {n:"自由拾潮人",m:"沒有旗幟的獨立探索者",g:"活下去，順便發點財。",w:"互相分享潮位與陷阱情報。",h:"角色多半從這裡出身，你也是。"}
  ];

  var tabs=document.getElementById("ftabs"),card=document.getElementById("fcard");
  function show(i){
    var f=F[i];
    card.innerHTML="<h3></h3><p class='meta'></p><dl><dt>他們想要</dt><dd></dd><dt>與你的關係</dt><dd></dd><dt>可能的伏筆</dt><dd></dd></dl>";
    card.querySelector("h3").textContent=f.n;
    card.querySelector(".meta").textContent=f.m;
    var d=card.querySelectorAll("dd");d[0].textContent=f.g;d[1].textContent=f.w;d[2].textContent=f.h;
    [].forEach.call(tabs.children,function(b,j){b.setAttribute("aria-selected",j===i)});
  }
  F.forEach(function(f,i){
    var b=document.createElement("button");
    b.type="button";
    b.setAttribute("role","tab");
    b.textContent=f.n;
    b.onclick=function(){show(i)};
    tabs.appendChild(b);
  });
  if(tabs.children.length > 0) show(0);

  var tide=document.getElementById("tide");
  function upd(){var h=document.documentElement.scrollHeight-innerHeight;if(tide)tide.style.height=(h>0?scrollY/h*100:0)+"%"}
  addEventListener("scroll",upd,{passive:true});upd();

  var ROLES=["拾潮人（探索者）","領航員","機修師","鹽祭司","放逐衛兵"];
  var ST=[["體魄","打架、搬重物、游泳"],["手藝","開鎖、修理、製作"],["洞察","觀察、察覺陷阱、判斷潮位"],["交際","說服、談判、打聽消息"]];
  var val={體魄:0,手藝:0,洞察:0,交際:0},KEY="tide-sheet";

  function opts(id,arr){var s=document.getElementById(id);if(!s)return;arr.forEach(function(t){var o=document.createElement("option");o.textContent=t;s.appendChild(o)})}
  opts("fRole",ROLES);opts("fFac",F.map(function(f){return f.n}));

  var sEl=document.getElementById("stats"),lEl=document.getElementById("left");
  function pts(){return 6-ST.reduce(function(a,s){return a+val[s[0]]},0)}
  function drawStats(){
    if(!sEl) return;
    sEl.innerHTML="";
    ST.forEach(function(s){
      var r=document.createElement("div");r.className="stat";
      var n=document.createElement("span");n.className="n";n.textContent=s[0];
      var em=document.createElement("em");em.textContent=s[1];n.appendChild(em);
      var m=document.createElement("button");m.type="button";m.textContent="−";m.setAttribute("aria-label",s[0]+" 減 1");m.disabled=val[s[0]]<=0;
      var o=document.createElement("output");o.textContent=val[s[0]];
      var p=document.createElement("button");p.type="button";p.textContent="+";p.setAttribute("aria-label",s[0]+" 加 1");p.disabled=val[s[0]]>=3||pts()<=0;
      m.onclick=function(){val[s[0]]--;drawStats();save()};
      p.onclick=function(){val[s[0]]++;drawStats();save()};
      r.appendChild(n);r.appendChild(m);r.appendChild(o);r.appendChild(p);sEl.appendChild(r);
    });
    if(lEl) lEl.textContent="共 6 點，每項最多 3。剩餘 "+pts()+" 點。";
  }

  var fields=document.querySelectorAll("[data-f]");
  function collect(){var d={stats:val};[].forEach.call(fields,function(e){d[e.dataset.f]=e.value});return d}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(collect()))}catch(e){}}
  function load(){try{var d=JSON.parse(localStorage.getItem(KEY)||"null");if(!d)return;
    [].forEach.call(fields,function(e){if(d[e.dataset.f]!=null)e.value=d[e.dataset.f]});
    if(d.stats)ST.forEach(function(s){val[s[0]]=Math.min(3,+d.stats[s[0]]||0)});
  }catch(e){}}
  [].forEach.call(fields,function(e){e.addEventListener("input",save)});
  load();drawStats();

  var msg=document.getElementById("msg"),out=document.getElementById("out");
  var copyBtn = document.getElementById("copy");
  if(copyBtn) {
    copyBtn.onclick=function(){
      var d=collect(),t="【角色卡】\n名字："+(d.name||"（未填）")+"\n身分："+d.role+"\n出身勢力："+d.fac+"\n能力："+ST.map(function(s){return s[0]+" "+val[s[0]]}).join(" ")+"\n擅長："+d.skills+"\n弱點："+d.weak+"\n願望："+d.wish+"\n隨身物品："+d.items+"\n背景："+d.story;
      out.value=t;out.hidden=false;
      function ok(){msg.textContent="已複製，可以貼給 GM。"}
      function no(){out.select();msg.textContent="請長按下方文字手動複製。"}
      try{navigator.clipboard.writeText(t).then(ok,no)}catch(e){no()}
    };
  }

  var clearBtn = document.getElementById("clear");
  if(clearBtn) {
    clearBtn.onclick=function(){
      if(!confirm("確定要清空所有欄位嗎？"))return;
      [].forEach.call(fields,function(e){e.value=e.tagName==="SELECT"?e.options[0].value:""});
      ST.forEach(function(s){val[s[0]]=0});out.hidden=true;editId=null;
      var pub = document.getElementById("pub");
      if(pub) pub.checked=false;
      msg.textContent="已清空。";drawStats();save();
    };
  }

  var SERIF='"Noto Serif TC","Songti TC","PMingLiU",serif',SANS='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  var GOLD="#e2b44a",lastCanvas=null,dl=null,dlBtn=document.getElementById("dl");
  function wrapT(ctx,text,maxW){var lines=[];text.split("\n").forEach(function(par){var line="";Array.from(par).forEach(function(ch){var t=line+ch;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=ch}else line=t});lines.push(line)});return lines}
  
  function render(ctx,d){
    var W=1080,P=84,IW=W-2*P,y=130;
    ctx.textBaseline="alphabetic";ctx.textAlign="left";
    ctx.fillStyle=GOLD;ctx.font="600 30px "+SERIF;ctx.fillText("潮汐群島 拾潮人角色卡",P,y);
    y+=120;
    var nm=d.name||"（未命名）",size=104;
    do{size-=4;ctx.font="900 "+size+"px "+SERIF}while(ctx.measureText(nm).width>IW&&size>40);
    ctx.fillStyle="#f3ebfb";ctx.fillText(nm,P,y);
    y+=64;ctx.fillStyle="#b08ae0";ctx.font="500 38px "+SANS;ctx.fillText(d.role+" ／ "+d.fac,P,y);
    y+=44;ctx.fillStyle=GOLD;ctx.fillRect(P,y,IW,3);
    y+=76;
    ST.forEach(function(s,i){
      var cx=P+(i%2)*(IW/2),cy=y+Math.floor(i/2)*92;
      ctx.fillStyle="#ece3f5";ctx.font="500 38px "+SANS;ctx.fillText(s[0],cx,cy);
      for(var k=0;k<3;k++){
        ctx.beginPath();ctx.arc(cx+190+k*48,cy-12,16,0,7);
        if(k<val[s[0]]){ctx.fillStyle=GOLD;ctx.fill()}
        ctx.strokeStyle=GOLD;ctx.lineWidth=3;ctx.stroke();
      }
    });
    y+=92+64;
    [["擅長",d.skills],["弱點",d.weak],["願望",d.wish],["隨身物品",d.items],["背景故事",d.story]].forEach(function(sec){
      ctx.font="400 32px "+SANS;
      var lines=wrapT(ctx,(sec[1]||"").trim()||"（未填）",IW-64),h=lines.length*50+98;
      ctx.fillStyle="rgba(255,255,255,.07)";ctx.fillRect(P,y,IW,h);
      ctx.fillStyle=GOLD;ctx.fillRect(P,y,6,h);
      ctx.font="600 28px "+SERIF;ctx.fillText(sec[0],P+32,y+56);
      ctx.fillStyle="#ece3f5";ctx.font="400 32px "+SANS;
      lines.forEach(function(l,i){ctx.fillText(l,P+32,y+112+i*50)});
      y+=h+24;
    });
    ctx.fillStyle="#8b78a3";ctx.font="400 24px "+SANS;ctx.fillText("潮汐群島 世界觀導覽",P,y+34);
    return y+34;
  }

  async function makeImage(){
    var d=collect(),txt="潮汐群島拾潮人角色卡體魄手藝洞察交際擅長弱點願望隨身物品背景故事（未填）（未命名）／ "+Object.keys(d).map(function(k){return typeof d[k]==="string"?d[k]:""}).join("");
    try{await Promise.all([document.fonts.load('900 60px "Noto Serif TC"',txt),document.fonts.load('600 30px "Noto Serif TC"',txt),document.fonts.load('400 30px "Noto Sans TC"',txt),document.fonts.load('500 30px "Noto Sans TC"',txt)])}catch(e){}
    var W=1080,c=document.createElement("canvas");c.width=W;c.height=2400;
    var end=render(c.getContext("2d"),d),H=Math.max(1500,end+96);
    c.height=H;var ctx=c.getContext("2d");
    var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#2c1848");g.addColorStop(1,"#150c22");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=GOLD;ctx.lineWidth=4;ctx.strokeRect(28,28,W-56,H-56);
    ctx.globalAlpha=.5;ctx.lineWidth=1.5;ctx.strokeRect(44,44,W-88,H-88);ctx.globalAlpha=1;
    render(ctx,d);
    lastCanvas=c;
    document.getElementById("cardimg").src=c.toDataURL("image/png");
    document.getElementById("imgbox").hidden=false;
    if(dlBtn) dlBtn.hidden=!dl;
    document.getElementById("imgbox").scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  var mkImgBtn = document.getElementById("mkimg");
  if(mkImgBtn) {
    mkImgBtn.onclick=function(){
      msg.textContent="正在產生圖片…";
      makeImage().then(function(){msg.textContent="角色卡圖片完成。"},function(){msg.textContent="產生失敗，請再試一次。"});
    };
  }

  dl={save:function(o){var a=document.createElement("a");a.href=URL.createObjectURL(o.data);a.download=o.filename;document.body.appendChild(a);a.click();a.remove();return Promise.resolve()}};
  if(dlBtn) {
    dlBtn.onclick=function(){
      if(!dl||!lastCanvas)return;
      lastCanvas.toBlob(function(b){
        var n=((collect().name||"角色卡")+"").replace(/[\\\/:*?"<>|]/g,"").slice(0,40)||"角色卡";
        dl.save({filename:n+".png",data:b}).then(function(){msg.textContent="已儲存。"},function(e){msg.textContent=(e&&e.code==="declined")?"已取消儲存。":"無法下載，請長按圖片儲存。"});
      },"image/png");
    };
  }

  var GK=[["fam","同家族"],["world","同世界"],["fac","同陣營"],["by","同創作者"]],GL={fam:"家族",world:"世界",fac:"陣營",by:"創作者"};
  var grp="fam",pubDocs=[],priv=[],editId=null,pubState="wait",libErr="";
  
  function newId(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function mk(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
  function say(t){if(msg)msg.textContent=t}
  function jump(id){var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:"smooth"})}
  function errMsg(e){var m=e&&e.message;return m==="auth"?"驗證失敗，請重新登入。":m==="forbidden"?"沒有權限執行這個操作。":"操作失敗，請稍後再試。"}
  
  // 登出專用函式：清除 Session 並引導回登入頁
  function logout(){
    sessionStorage.removeItem("tide-auth");
    sessionStorage.removeItem("tide-guest");
    location.href="index.html";
  }

  function who(){
    var whoEl = document.getElementById("whoami");
    var chgEl = document.getElementById("chg");
    var nlEl = document.getElementById("navlogin");
    if(whoEl) whoEl.textContent=auth?"已登入創作者：「"+nick+"」":"訪客模式：可以閱讀世界觀，登入後才能儲存角色。";
    if(chgEl) chgEl.textContent=auth?"登出／更換暱稱":"登入創作者";
    if(nlEl) nlEl.textContent=auth?"登出":"登入創作者";
  }

  function card(c,skip,acts,badge){
    var d=mk("div","gc");d.appendChild(mk("b",null,c.n||"（未命名）"));
    if(badge)d.appendChild(mk("span","me",badge));
    d.appendChild(mk("div","r",c.role||""));
    var t=mk("div","t");
    GK.forEach(function(x){if(x[0]!==skip&&c[x[0]])t.appendChild(mk("span",null,GL[x[0]]+"："+c[x[0]]))});
    d.appendChild(t);
    acts.forEach(function(a){var bt=mk("button","rm",a[0]);bt.type="button";bt.onclick=a[1];d.appendChild(bt)});
    return d;
  }

  var gt=document.getElementById("gtabs"),gg=document.getElementById("ggrid");
  function renderG(){
    if(!gt || !gg) return;
    [].forEach.call(gt.children,function(b,i){b.setAttribute("aria-selected",GK[i][0]===grp)});
    gg.innerHTML="";
    if(pubState==="wait"){gg.appendChild(mk("p","sub","載入櫥窗中…"));return}
    if(pubState==="none"){gg.appendChild(mk("p","sub","目前無法連線到後端，請確認 main.js 裡的 API_URL。"));return}
    if(!pubDocs.length){gg.appendChild(mk("p","sub","櫥窗還是空的。填寫角色卡並勾選「將角色擺放至櫥窗」，成為第一個。"));return}
    var g={};pubDocs.forEach(function(c){var k=(c[grp]||"").trim()||"（未填）";(g[k]=g[k]||[]).push(c)});
    Object.keys(g).sort(function(a,b){return a.localeCompare(b,"zh-Hant")}).forEach(function(k){
      var s=mk("div","grp");s.appendChild(mk("h3",null,k+" "+g[k].length+" 人"));
      var cs=mk("div","gcards");
      g[k].forEach(function(c){
        var own=auth&&c.by===nick;
        cs.appendChild(card(c,grp,own?[["收回到私人角色庫",function(){setPub(c,false)}]]:[],own?"我的":null));
      });
      s.appendChild(cs);gg.appendChild(s);
    });
  }

  if(gt) {
    GK.forEach(function(x){
      var b=mk("button",null,x[1]);
      b.type="button";
      b.setAttribute("role","tab");
      b.onclick=function(){grp=x[0];renderG()};
      gt.appendChild(b);
    });
  }

  async function loadPub(){try{pubDocs=(await api("listPublic")).items||[];pubState="ok"}catch(e){pubState="none"}renderG()}
  async function loadPriv(){
    if(auth){
      try{priv=(await api("listPrivate",auth)).items||[];libErr=""}
      catch(e){
        console.warn("listPrivate failed:",e);
        libErr=e.message==="auth"?"私人角色庫驗證失敗。請點擊「登出／更換暱稱」重新登入。":"無法載入私人角色庫："+e.message;
      }
    }
    renderLib();
  }

  function refresh(){return Promise.all([loadPub(),loadPriv()])}
  function setPub(c,v){api("setPublic",{nick:auth.nick,code:auth.code,id:c.id,public:v}).then(refresh).then(function(){say(v?"已放到櫥窗。":"已收回到私人角色庫。")},function(e){say(errMsg(e))})}
  function delChar(c){if(confirm("確定刪除「"+c.n+"」？"))api("deleteChar",{nick:auth.nick,code:auth.code,id:c.id}).then(refresh).catch(function(e){say(errMsg(e))})}
  
  function loadChar(c){
    [].forEach.call(fields,function(e){if(c[e.dataset.f]!=null)e.value=c[e.dataset.f]});
    ST.forEach(function(s){val[s[0]]=Math.min(3,+((c.stats||{})[s[0]])||0)});
    var pub = document.getElementById("pub");
    if(pub) pub.checked=false;
    editId=c.id;drawStats();save();
    say("正在編輯「"+c.n+"」，儲存後會覆蓋原角色。");jump("sheet");
  }

  function renderLib(){
    var box=document.getElementById("lib");
    if(!box) return;
    box.innerHTML="";
    if(!auth){
      box.appendChild(mk("p","sub","登入創作者暱稱與安全碼後，才看得到私人角色庫。"));
      var lb=mk("button","cta","登入");lb.type="button";lb.style.cssText="border:0;cursor:pointer;font:inherit";
      lb.onclick=logout;
      box.appendChild(lb);
      return;
    }
    if(libErr){box.appendChild(mk("p","sub",libErr));return}
    var all=priv.slice().sort(function(a,b){return (b.at||0)-(a.at||0)});
    if(!all.length){box.appendChild(mk("p","sub","私人角色庫是空的。填寫角色卡並且不勾選櫥窗選項，角色就會存放在這裡。"));return}
    var cs=mk("div","gcards");
    all.forEach(function(c){cs.appendChild(card(c,null,[["載入編輯",function(){loadChar(c)}],["放到櫥窗",function(){setPub(c,true)}],["刪除",function(){delChar(c)}]],"私人"))});
    box.appendChild(cs);
  }

  var chgBtn = document.getElementById("chg");
  if(chgBtn) chgBtn.onclick = logout;

  var navLoginBtn = document.getElementById("navlogin");
  if(navLoginBtn) {
    navLoginBtn.onclick = function(e) {
      e.preventDefault();
      logout();
    };
  }

  who();renderG();renderLib();refresh();

  var addgBtn = document.getElementById("addg");
  if(addgBtn) {
    addgBtn.onclick=function(){
      if(!auth){say("請先登入創作者暱稱與安全碼。");return}
      var d=collect();
      if(!(d.name||"").trim()){say("請先填寫角色名字。");return}
      var pubEl=document.getElementById("pub");
      var pub=pubEl?pubEl.checked:false;
      var o={id:editId||newId(),n:d.name.trim(),role:d.role,fac:d.fac,fam:(d.fam||"").trim(),world:(d.world||"").trim(),by:nick,at:Date.now(),stats:Object.assign({},val),skills:d.skills,weak:d.weak,wish:d.wish,items:d.items,story:d.story};
      api("saveChar",{nick:auth.nick,code:auth.code,char:o,public:pub}).then(function(){editId=null;say(pub?"已擺放到櫥窗。":"已存進私人角色庫。");return refresh()}).then(function(){jump(pub?"gallery":"library")},function(e){say(errMsg(e))});
    };
  }

  var themeBtn = document.getElementById("theme");
  if(themeBtn) {
    themeBtn.onclick=function(){
      var r=document.documentElement,cur=r.getAttribute("data-theme");
      var dark=cur?cur==="dark":matchMedia("(prefers-color-scheme:dark)").matches;
      r.setAttribute("data-theme",dark?"light":"dark");
    };
  }
}

/* ---------- 啟動進入點 ---------- */
function boot() {
  if (document.getElementById("next")) {
    initLogin(); 
  } else {
    initMain();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
