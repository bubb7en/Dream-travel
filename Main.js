}
async function makeImage(){
var d=collect(),txt="潮汐群島拾潮人角色卡體魄手藝洞察交際擅長弱點願望隨身物品背景故事（未填）（未命名）／　"+Object.keys(d).map(function(k){return typeof d[k]==="string"?d[k]:""}).join("");
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
dlBtn.hidden=!dl;
document.getElementById("imgbox").scrollIntoView({behavior:"smooth",block:"nearest"});
}
document.getElementById("mkimg").onclick=function(){msg.textContent="正在產生圖片…";makeImage().then(function(){msg.textContent="角色卡圖片完成。"},function(){msg.textContent="產生失敗，請再試一次。"})};
try{if(window.claude&&claude.use)claude.use("downloads").then(function(x){dl=x;if(x&&lastCanvas)dlBtn.hidden=false},function(){})}catch(e){}
dlBtn.onclick=function(){
if(!dl||!lastCanvas)return;
lastCanvas.toBlob(function(b){
var n=((collect().name||"角色卡")+"").replace(/[\\\/:*?"<>|]/g,"").slice(0,40)||"角色卡";
dl.save({filename:n+".png",data:b}).then(function(){msg.textContent="已儲存。"},function(e){msg.textContent=(e&&e.code==="declined")?"已取消儲存。":"無法下載，請長按圖片儲存。"});
},"image/png");
};
document.getElementById("theme").onclick=function(){
var r=document.documentElement,cur=r.getAttribute("data-theme");
var dark=cur?cur==="dark":matchMedia("(prefers-color-scheme:dark)").matches;
r.setAttribute("data-theme",dark?"light":"dark");
};
</script>
