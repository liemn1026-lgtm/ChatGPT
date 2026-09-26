import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const clone = (x) => JSON.parse(JSON.stringify(x));
const initial = () => ({
  started:false,
  serverTime:"08:00",
  weather:"Trời quang",
  currentMap:"Làng Aru",
  godMode:false,
  broadcast:null,
  dragonBalls:0,
  players:{},
  mobs:[],
  bosses:[],
  events:[],
  clans:{},
  quests:[],
  logs:[],
  saved:null
});
let state = initial();

const races=["Saiyan","Namek","Trái Đất","Majin","Android"];
const log=(msg)=>{state.logs.unshift({at:new Date().toISOString(),msg});state.logs=state.logs.slice(0,100);};
const status=()=>({
  started:state.started,
  playerCount:Object.keys(state.players).length,
  currentMap:state.currentMap,
  activeBosses:state.bosses.filter(b=>b.hp>0).map(b=>b.name),
  activeEvents:state.events.filter(e=>e.active).map(e=>e.name),
  serverTime:state.serverTime,
  weather:state.weather,
  dragonBalls:state.dragonBalls,
  godMode:state.godMode
});
const mkPlayer=(name,race="Saiyan")=>({
  name,race:races.includes(race)?race:"Saiyan",level:1,exp:0,power:1000,
  hp:1000,maxHp:1000,ki:500,maxKi:500,mp:100,maxMp:100,
  armor:10,speed:10,crit:5,dodge:5,map:"Làng Aru",banned:false,
  inventory:[],equipment:[],skills:["Đấm cơ bản","Bay"],clan:null,quests:[]
});
const tokenize=(s)=>s.trim().split(/\s+/);

function execute(raw){
  const input=String(raw||"").trim();
  if(!input) return {ok:false,message:"Admin chưa nhập lệnh."};
  const t=tokenize(input), cmd=t[0].toLowerCase(), a=t.slice(1);
  const need=(n)=>{if(!state.players[n]) throw new Error("Không tìm thấy người chơi "+n); return state.players[n];};
  try{
    if(cmd==="/start" || input.toLowerCase()==="bắt đầu game"){
      state.started=true; log("Server đã khởi động");
      return {ok:true,message:"Chào Admin. Server đã khởi động.",status:status()};
    }
    if(cmd==="/help") return {ok:true,message:"Danh sách lệnh admin đã sẵn sàng.",commands:["/status","/list_players","/create_player [tên] [tộc]","/give_item [player] [item] [số lượng]","/set_level [player] [level]","/spawn_boss [tên]","/event [tên]","/pvp [p1] [p2]","/save","/load","/reset_server"]};
    if(cmd==="/status") return {ok:true,status:status()};
    if(cmd==="/list_players") return {ok:true,players:Object.values(state.players)};
    if(cmd==="/create_player"){
      const [name,race="Saiyan"]=a; if(!name) throw new Error("Thiếu tên người chơi"); if(state.players[name]) throw new Error("Tên đã tồn tại");
      state.players[name]=mkPlayer(name,race); log("Tạo người chơi "+name); return {ok:true,player:state.players[name]};
    }
    if(cmd==="/delete_player"){const [name]=a; need(name); delete state.players[name]; log("Xóa người chơi "+name); return {ok:true,message:"Đã xóa "+name};}
    if(cmd==="/give_item"){const [name,...rest]=a; const qty=Math.max(1,Number(rest.pop())||1); const item=rest.join(" ")||"Đậu Thần"; const p=need(name); p.inventory.push({item,qty}); return {ok:true,player:p};}
    if(cmd==="/set_level"){const [name,v]=a; const p=need(name); p.level=Math.max(1,Number(v)||1); return {ok:true,player:p};}
    if(cmd==="/set_stats"){const [name,key,v]=a; const p=need(name); const aliases={hp:"hp",ki:"ki",mp:"mp","sức_mạnh":"power","suc_manh":"power",armor:"armor","giáp":"armor","toc_do":"speed","tốc_độ":"speed","chi_mang":"crit","chí_mạng":"crit","ne_tranh":"dodge","né_tránh":"dodge"}; const k=aliases[key]||key; if(!(k in p)) throw new Error("Chỉ số không hợp lệ"); p[k]=Number(v)||0; return {ok:true,player:p};}
    if(cmd==="/add_skill"){const [name,...sk]=a; const p=need(name); const skill=sk.join(" "); if(!skill) throw new Error("Thiếu kỹ năng"); if(!p.skills.includes(skill)) p.skills.push(skill); return {ok:true,player:p};}
    if(cmd==="/spawn_boss"){const name=a.join(" ")||"Boss Bí Ẩn"; const boss={id:crypto.randomUUID(),name,hp:1000000,maxHp:1000000,map:state.currentMap}; state.bosses.push(boss); log("Boss xuất hiện: "+name); return {ok:true,boss};}
    if(cmd==="/spawn_mob"){const count=Math.max(1,Math.min(50,Number(a.at(-1))||1)); const name=(Number(a.at(-1))?a.slice(0,-1):a).join(" ")||"Quái"; for(let i=0;i<count;i++) state.mobs.push({id:crypto.randomUUID(),name,hp:1000,map:state.currentMap}); return {ok:true,message:"Đã gọi "+count+" "+name};}
    if(cmd==="/event"){const name=a.join(" ")||"Sự kiện bất ngờ"; state.events.push({id:crypto.randomUUID(),name,active:true,startedAt:new Date().toISOString()}); log("Mở sự kiện "+name); return {ok:true,message:"Đã mở sự kiện "+name};}
    if(cmd==="/broadcast"){state.broadcast=a.join(" "); log("Thông báo: "+state.broadcast); return {ok:true,message:state.broadcast};}
    if(cmd==="/ban"||cmd==="/unban"){const p=need(a[0]); p.banned=cmd==="/ban"; return {ok:true,player:p};}
    if(cmd==="/teleport"){const [name,...m]=a; const p=need(name); p.map=m.join(" ")||state.currentMap; return {ok:true,player:p};}
    if(cmd==="/set_map"){state.currentMap=a.join(" ")||"Làng Aru"; return {ok:true,status:status()};}
    if(cmd==="/quest"){const [name,...q]=a; const p=need(name); const quest=q.join(" ")||"Nhiệm vụ bí ẩn"; p.quests.push(quest); state.quests.push({player:name,quest,done:false}); return {ok:true,player:p};}
    if(cmd==="/clan"){const name=a.join(" ")||"Bang Hội Mới"; if(!state.clans[name]) state.clans[name]={name,members:[],level:1}; return {ok:true,clan:state.clans[name]};}
    if(cmd==="/pvp"){
      const [n1,n2]=a, p1=need(n1),p2=need(n2);
      const score=(p)=>p.power+p.level*1000+p.hp+p.ki+p.speed*50+p.crit*100+Math.random()*5000;
      const winner=score(p1)>=score(p2)?p1:p2, loser=winner===p1?p2:p1;
      loser.hp=Math.max(1,Math.floor(loser.hp*.25)); winner.exp+=500; winner.power+=250;
      log("PvP: "+winner.name+" thắng "+loser.name); return {ok:true,winner:winner.name,loser:loser.name};
    }
    if(cmd==="/tournament"){state.events.push({id:crypto.randomUUID(),name:"Đại Hội Võ Thuật",active:true}); return {ok:true,message:"Đại Hội Võ Thuật đã bắt đầu"};}
    if(cmd==="/dragon_ball"){state.dragonBalls=Math.max(0,Number(a[0])||0); return {ok:true,dragonBalls:state.dragonBalls};}
    if(cmd==="/wish"){if(state.dragonBalls<7) throw new Error("Cần đủ 7 viên Ngọc Rồng"); state.dragonBalls-=7; const wish=a.join(" ")||"Điều ước bí ẩn"; log("Rồng Thần ban điều ước: "+wish); return {ok:true,message:"Điều ước đã được thực hiện: "+wish};}
    if(cmd==="/god_mode"){state.godMode=!state.godMode; return {ok:true,godMode:state.godMode};}
    if(cmd==="/time"){state.serverTime=a.join(" ")||state.serverTime; return {ok:true,status:status()};}
    if(cmd==="/weather"){state.weather=a.join(" ")||state.weather; return {ok:true,status:status()};}
    if(cmd==="/save"){state.saved=clone({...state,saved:null}); return {ok:true,message:"Đã lưu trạng thái server"};}
    if(cmd==="/load"){if(!state.saved) throw new Error("Chưa có bản lưu"); state=clone({...state.saved,saved:state.saved}); return {ok:true,message:"Đã tải trạng thái server",status:status()};}
    if(cmd==="/reset_server"){state=initial(); return {ok:true,message:"Server đã reset"};}
    return {ok:false,message:"Lệnh chưa hỗ trợ. Dùng /help."};
  } catch(e){return {ok:false,message:e.message};}
}

app.get("/health",(req,res)=>res.json({ok:true,service:"NRO AI Game Master"}));
app.get("/api/status",(req,res)=>res.json(status()));
app.get("/api/players",(req,res)=>res.json(Object.values(state.players)));
app.get("/api/world",(req,res)=>res.json(state));
app.post("/api/admin/command",(req,res)=>res.json(execute(req.body?.command)));
app.post("/api/reset",(req,res)=>{state=initial();res.json({ok:true,status:status()});});
app.get("/",(req,res)=>res.json({name:"NRO AI Game Master",message:"Chào Admin",endpoints:["/health","/api/status","/api/players","/api/world","POST /api/admin/command"]}));

const port=process.env.PORT||3000;
app.listen(port,()=>console.log("NRO AI Game Master listening on",port));