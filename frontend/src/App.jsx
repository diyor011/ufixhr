import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// ════════════════════════════════════════════════════════════════════════════
//  UFIX ATTENDANCE — React + Redux (useReducer) rewrite
//  Original: vanilla HTML/JS two-page site
//  New:      single JSX file, Redux-style state management
// ════════════════════════════════════════════════════════════════════════════

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CREDS = { username: "ufix710@gmail.com", password: "yusuf1414ufixhr" };
const SERVER = "http://localhost:5000";
const BOT_TOKEN = "8758406348:AAEjNIPMChEc1gZ3IQlh7aUCShVwutGHOFU";
const CHAT_IDS = ["5952683615", "39730332", "8473394162"];

const SHIFT_LABELS = {
  "08:00": "Day: 08:00-16:00",
  "16:00": "Main: 16:00-00:00",
  "00:00": "Night: 00:00-08:00",
};
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WEEK_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ─── ACTION TYPES ─────────────────────────────────────────────────────────────
const A = {
  LOGIN:"LOGIN", LOGOUT:"LOGOUT",
  OPEN_SHIFT:"OPEN_SHIFT", GO_HOME:"GO_HOME", OPEN_SCHEDULE:"OPEN_SCHEDULE",
  SET_TAB:"SET_TAB", SET_EMPLOYEES:"SET_EMPLOYEES",
  SELECT_CI:"SELECT_CI", SELECT_CO:"SELECT_CO",
  OPEN_CAMERA:"OPEN_CAMERA", CLOSE_CAMERA:"CLOSE_CAMERA",
  SET_PHOTO:"SET_PHOTO", RETAKE_PHOTO:"RETAKE_PHOTO",
  ADD_CI_LOG:"ADD_CI_LOG", ADD_CO_LOG:"ADD_CO_LOG",
  SHOW_TOAST:"SHOW_TOAST", HIDE_TOAST:"HIDE_TOAST",
  SET_LOADING:"SET_LOADING", CHECKIN_SUCCESS:"CHECKIN_SUCCESS", CHECKOUT_SUCCESS:"CHECKOUT_SUCCESS",
};

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initialState = {
  isAuthenticated: false,
  page:            "home",
  currentShift:    null,
  activeTab:       "checkin",
  employees:       [],
  selectedCI:      null,
  selectedCO:      null,
  cameraOpen:      false,
  capturedBlob:    null,
  photoUrl:        null,
  photoTaken:      false,
  ciLogs: [{ type:"info", msg:"System ready", sub:"Select an employee to begin" }],
  coLogs: [{ type:"info", msg:"Select employee to check out", sub:"" }],
  toast:    null,
  loading:  false,
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
function reducer(state, { type, payload }) {
  switch (type) {
    case A.LOGIN:            return { ...state, isAuthenticated: true };
    case A.LOGOUT:           return { ...initialState };
    case A.OPEN_SHIFT:       return { ...state, page:"shift", currentShift:payload, activeTab:"checkin", selectedCI:null, selectedCO:null, cameraOpen:false, capturedBlob:null, photoUrl:null, photoTaken:false };
    case A.GO_HOME:          return { ...state, page:"home", currentShift:null, selectedCI:null, selectedCO:null, cameraOpen:false, capturedBlob:null, photoUrl:null, photoTaken:false };
    case A.OPEN_SCHEDULE:    return { ...state, page:"schedule" };
    case A.SET_TAB:          return { ...state, activeTab:payload, selectedCI:null, selectedCO:null };
    case A.SET_EMPLOYEES:    return { ...state, employees:payload };
    case A.SELECT_CI:        return { ...state, selectedCI:payload };
    case A.SELECT_CO:        return { ...state, selectedCO:payload };
    case A.OPEN_CAMERA:      return { ...state, cameraOpen:true, photoTaken:false, capturedBlob:null, photoUrl:null };
    case A.CLOSE_CAMERA:     return { ...state, cameraOpen:false, capturedBlob:null, photoUrl:null, photoTaken:false };
    case A.SET_PHOTO:        return { ...state, capturedBlob:payload.blob, photoUrl:payload.url, photoTaken:true };
    case A.RETAKE_PHOTO:     return { ...state, capturedBlob:null, photoUrl:null, photoTaken:false };
    case A.ADD_CI_LOG:       return { ...state, ciLogs:[payload,...state.ciLogs].slice(0,30) };
    case A.ADD_CO_LOG:       return { ...state, coLogs:[payload,...state.coLogs].slice(0,30) };
    case A.SHOW_TOAST:       return { ...state, toast:payload };
    case A.HIDE_TOAST:       return { ...state, toast:null };
    case A.SET_LOADING:      return { ...state, loading:payload };
    case A.CHECKIN_SUCCESS:  return { ...state, selectedCI:null, cameraOpen:false, capturedBlob:null, photoUrl:null, photoTaken:false, loading:false };
    case A.CHECKOUT_SUCCESS: return { ...state, selectedCO:null, loading:false };
    default:                 return state;
  }
}

// ─── ACTION CREATORS ──────────────────────────────────────────────────────────
const ac = {
  login:           ()          => ({ type:A.LOGIN }),
  logout:          ()          => ({ type:A.LOGOUT }),
  openShift:       (shift)     => ({ type:A.OPEN_SHIFT, payload:shift }),
  goHome:          ()          => ({ type:A.GO_HOME }),
  openSchedule:    ()          => ({ type:A.OPEN_SCHEDULE }),
  setTab:          (tab)       => ({ type:A.SET_TAB, payload:tab }),
  setEmployees:    (list)      => ({ type:A.SET_EMPLOYEES, payload:list }),
  selectCI:        (emp)       => ({ type:A.SELECT_CI, payload:emp }),
  selectCO:        (emp)       => ({ type:A.SELECT_CO, payload:emp }),
  openCamera:      ()          => ({ type:A.OPEN_CAMERA }),
  closeCamera:     ()          => ({ type:A.CLOSE_CAMERA }),
  setPhoto:        (blob, url) => ({ type:A.SET_PHOTO, payload:{blob,url} }),
  retakePhoto:     ()          => ({ type:A.RETAKE_PHOTO }),
  addCILog:        (entry)     => ({ type:A.ADD_CI_LOG, payload:entry }),
  addCOLog:        (entry)     => ({ type:A.ADD_CO_LOG, payload:entry }),
  showToast:       (msg, type) => ({ type:A.SHOW_TOAST, payload:{msg,type} }),
  hideToast:       ()          => ({ type:A.HIDE_TOAST }),
  setLoading:      (v)         => ({ type:A.SET_LOADING, payload:v }),
  checkinSuccess:  ()          => ({ type:A.CHECKIN_SUCCESS }),
  checkoutSuccess: ()          => ({ type:A.CHECKOUT_SUCCESS }),
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function getShiftTimes(emp, now) {
  const h=parseInt(emp.shift); let start=new Date(now),end=new Date(now);
  if(h===8){start.setHours(8,0,0,0);end.setHours(16,0,0,0);}
  else if(h===16){start.setHours(16,0,0,0);end=new Date(now);end.setDate(end.getDate()+1);end.setHours(0,0,0,0);}
  else{if(now.getHours()>=20){start=new Date(now);start.setDate(start.getDate()+1);start.setHours(0,0,0,0);}else start.setHours(0,0,0,0);end=new Date(start);end.setHours(8,0,0,0);}
  return{start,end};
}
const isCheckinAllowed  =(emp,now)=>true; // проверка на сервере
const isCheckoutAllowed =(emp,now)=>true; // проверка на сервере
const calcLate  =(emp,now)=>{const{start}=getShiftTimes(emp,now);return Math.max(0,Math.floor((now-start)/60000));};
const formatLate=(m)=>{if(m<=0)return"✅ On time";const h=Math.floor(m/60),r=m%60;return h>0?`⏰ ${h}h ${r}min late`:`⏰ ${m} min late`;};
const formatDur =(m)=>{const h=Math.floor(m/60),r=m%60;if(h>0&&r>0)return h+"h "+r+"min";if(h>0)return h+"h";return m+"min";};
const nowTime   =()=>new Date().toTimeString().slice(0,8);
const mkLog     =(type,msg,sub="")=>({type,msg,sub:nowTime()+(sub?" · "+sub:"")});

async function sendMsgTelegram(text){
  try{const r=await Promise.all(CHAT_IDS.map(id=>fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:id,text})})));return r.some(x=>x.ok);}catch{return false;}
}
async function sendPhotoTelegram(blob,caption){
  try{const r=await Promise.all(CHAT_IDS.map(id=>{const f=new FormData();f.append("chat_id",id);f.append("caption",caption);f.append("photo",blob,"checkin.jpg");return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,{method:"POST",body:f});}));return r.some(x=>x.ok);}catch{return false;}
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#020408;color:#fff;min-height:100vh;overflow-x:hidden}
#ufix-canvas{position:fixed;inset:0;z-index:0;opacity:.5;pointer-events:none}
.ufix-orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:ufixOrb linear infinite}
.ufix-orb1{width:500px;height:500px;background:radial-gradient(circle,rgba(99,102,241,.3),transparent 70%);top:-100px;left:-100px;animation-duration:20s}
.ufix-orb2{width:400px;height:400px;background:radial-gradient(circle,rgba(236,72,153,.2),transparent 70%);bottom:-80px;right:-80px;animation-duration:25s;animation-delay:-10s}
.ufix-orb3{width:300px;height:300px;background:radial-gradient(circle,rgba(6,182,212,.18),transparent 70%);top:40%;left:40%;animation-duration:18s;animation-delay:-5s}
@keyframes ufixOrb{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-40px) scale(1.05)}50%{transform:translate(-20px,30px) scale(.95)}75%{transform:translate(40px,20px) scale(1.08)}}
@keyframes ufixShimmer{0%{background-position:0%}100%{background-position:200%}}
@keyframes ufixFadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes ufixPing{0%{box-shadow:0 0 0 0 rgba(74,222,128,.7)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
@keyframes ufixPulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes boxIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{transform:translateX(-50%) translateY(60px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#020408}::-webkit-scrollbar-thumb{background:rgba(99,102,241,.4);border-radius:2px}
.emp-card:hover{border-color:rgba(165,180,252,.3)!important;background:rgba(99,102,241,.06)!important;transform:translateY(-2px)!important}
.shift-card:hover{transform:translateY(-6px) scale(1.01)!important;border-color:rgba(255,255,255,.18)!important;box-shadow:0 24px 48px rgba(0,0,0,.4)!important}
@media(max-width:640px){.shift-grid{grid-template-columns:1fr!important}.page-pad{padding:16px!important}}
`

// ════════════════════════════════════════════════════════════════════════════
//  UI COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function GlowOrb(){
  const ref=React.useRef(null);
  React.useEffect(()=>{
    const cvs=document.createElement('canvas');
    cvs.id='ufix-canvas';
    cvs.style.cssText='position:fixed;inset:0;z-index:0;opacity:.5;pointer-events:none';
    document.body.prepend(cvs);
    const ctx=cvs.getContext('2d');
    let W,H,pts=[];
    const resize=()=>{W=cvs.width=window.innerWidth;H=cvs.height=window.innerHeight;pts=Array.from({length:55},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5,o:Math.random()*.35+.08}));};
    resize();window.addEventListener('resize',resize);
    let raf;
    const draw=()=>{ctx.clearRect(0,0,W,H);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(165,180,252,'+p.o+')';ctx.fill();});pts.forEach((a,i)=>pts.slice(i+1).forEach(b=>{const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<90){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(99,102,241,'+(0.1*(1-d/90))+')';ctx.lineWidth=.5;ctx.stroke();}}));raf=requestAnimationFrame(draw);};
    draw();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);cvs.remove();};
  },[]);
  return(
    <>
      <div className="ufix-orb ufix-orb1"/>
      <div className="ufix-orb ufix-orb2"/>
      <div className="ufix-orb ufix-orb3"/>
    </>
  );
}

function LiveClock(){
  const fmt=(n)=>({time:n.toTimeString().slice(0,8),date:DAYS[n.getDay()]+" · "+n.getDate()+" "+MONTHS_SHORT[n.getMonth()]+" "+n.getFullYear()});
  const [t,setT]=useState(()=>fmt(new Date()));
  useEffect(()=>{const id=setInterval(()=>setT(fmt(new Date())),1000);return()=>clearInterval(id);},[]);
  return(
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:26,fontWeight:700,background:"linear-gradient(90deg,#a5b4fc,#f0abfc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2}}>{t.time}</div>
      <div style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:3,textTransform:"uppercase",marginTop:3}}>{t.date}</div>
    </div>
  );
}

function Btn({variant="ghost",children,onClick,disabled,style={}}){
  const [hov,setHov]=useState(false);
  const base={display:"inline-flex",alignItems:"center",gap:8,padding:"10px 22px",border:"1px solid",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:600,cursor:disabled?"not-allowed":"pointer",transition:"all .2s",letterSpacing:2,textTransform:"uppercase",opacity:disabled?.3:1,borderRadius:9,...style};
  const map={
    green:{background:hov?"rgba(74,222,128,.2)":"rgba(74,222,128,.1)",color:"#4ade80",borderColor:hov?"rgba(74,222,128,.7)":"rgba(74,222,128,.35)",boxShadow:hov?"0 0 20px rgba(74,222,128,.2)":"none"},
    red:{background:hov?"rgba(248,113,113,.2)":"rgba(248,113,113,.1)",color:"#f87171",borderColor:hov?"rgba(248,113,113,.7)":"rgba(248,113,113,.35)",boxShadow:hov?"0 0 20px rgba(248,113,113,.2)":"none"},
    yellow:{background:hov?"rgba(251,191,36,.2)":"rgba(251,191,36,.1)",color:"#fbbf24",borderColor:hov?"rgba(251,191,36,.7)":"rgba(251,191,36,.35)"},
    ghost:{background:hov?"rgba(255,255,255,.08)":"rgba(255,255,255,.05)",color:hov?"#fff":"rgba(255,255,255,.6)",borderColor:hov?"rgba(255,255,255,.3)":"rgba(255,255,255,.15)"},
  };
  return<button style={{...base,...(map[variant]||{})}} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={!disabled?onClick:undefined}>{children}</button>;
}

function Spinner({color="#000"}){
  return<span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(0,0,0,.2)",borderTopColor:color,borderRadius:"50%",animation:"spin .6s linear infinite",verticalAlign:"middle"}}/>;
}

function Toast({toast}){
  if(!toast)return null;
  const c={success:"#4ade80",error:"#f87171",info:"#a5b4fc"}[toast.type]||"#a5b4fc";
  const b={success:"rgba(74,222,128,.35)",error:"rgba(248,113,113,.35)",info:"rgba(165,180,252,.35)"}[toast.type]||"rgba(165,180,252,.35)";
  return<div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"rgba(2,4,8,.95)",border:`1px solid ${b}`,borderRadius:10,padding:"12px 24px",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,letterSpacing:1,color:c,zIndex:300,whiteSpace:"nowrap",animation:"slideUp .3s cubic-bezier(.22,1,.36,1)",backdropFilter:"blur(20px)",boxShadow:`0 0 24px ${b}`}}>{toast.msg}</div>;
}

function LogBox({title,logs}){
  const c={success:"#4ade80",error:"#f87171",info:"#a5b4fc"};
  const bg={success:"rgba(74,222,128,.04)",error:"rgba(248,113,113,.04)",info:"rgba(165,180,252,.04)"};
  return(
    <div style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",overflow:"hidden",borderRadius:14}}>
      <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 8px #4ade80",animation:"ufixPulse 2s infinite"}}/>
        <div style={{fontFamily:"'Inter',sans-serif",fontSize:9,letterSpacing:4,color:"rgba(255,255,255,.3)",textTransform:"uppercase",fontWeight:600}}>{title}</div>
        <div style={{marginLeft:"auto",fontSize:8,letterSpacing:2,color:"rgba(74,222,128,.6)",textTransform:"uppercase"}}>Live</div>
      </div>
      <div style={{padding:8,maxHeight:220,overflowY:"auto"}}>
        {logs.map((l,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"10px 10px",borderBottom:"1px solid rgba(255,255,255,.03)",alignItems:"flex-start",transition:"background .2s",background:bg[l.type]||"transparent"}}>
            <div style={{width:2,borderRadius:1,background:c[l.type]||"rgba(255,255,255,.2)",alignSelf:"stretch",flexShrink:0,minHeight:28,boxShadow:`0 0 6px ${c[l.type]||"transparent"}`}}/>
            <div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:500}}>{l.msg}</div>
              {l.sub&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"rgba(255,255,255,.22)",marginTop:3,letterSpacing:1}}>{l.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmpGrid({employees,selectedId,onSelect}){
  const today=DAYS[new Date().getDay()];
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10,marginBottom:24}}>
      {employees.map(emp=>{
        const isOff=emp.off_day&&emp.off_day===today&&emp.off_day!=="None"&&emp.off_day!=="No day off";
        const isSel=emp.id===selectedId;
        return(
          <div key={emp.id} onClick={()=>!isOff&&onSelect(emp)}
            style={{position:"relative",overflow:"hidden",background:isSel?"rgba(99,102,241,.1)":"rgba(255,255,255,.02)",border:`1px solid ${isSel?"rgba(165,180,252,.45)":"rgba(255,255,255,.08)"}`,padding:16,cursor:isOff?"not-allowed":"pointer",transition:"all .25s",opacity:isOff?.35:1,borderRadius:12,boxShadow:isSel?"0 0 20px rgba(99,102,241,.15)":"none"}}>
            {isSel&&<div style={{position:"absolute",top:10,right:10,width:7,height:7,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 10px #4ade80",animation:"ufixPing 1.5s infinite"}}/>}
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,marginBottom:3}}>{emp.name}{isOff?" · off":""}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(165,180,252,.8)",marginBottom:5}}>{emp.id}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.28)",letterSpacing:1,textTransform:"uppercase"}}>{SHIFT_LABELS[emp.shift]||emp.shift}</div>
            {emp.off_day&&emp.off_day!=="None"&&emp.off_day!=="No day off"&&<div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:"#f87171",marginTop:5,letterSpacing:1}}>off: {emp.off_day}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGES
// ════════════════════════════════════════════════════════════════════════════

function LoginPage({dispatch}){
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [sp,setSp]=useState(false);
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const [granted,setGranted]=useState(false); const [shake,setShake]=useState(false);

  const doLogin=()=>{
    setErr("");
    if(!u||!p){setErr("Please fill in all fields");setShake(true);setTimeout(()=>setShake(false),400);return;}
    setLoading(true);
    setTimeout(()=>{
      if(u===CREDS.username&&p===CREDS.password){
        setGranted(true); localStorage.setItem("ufix_auth","1");
        setTimeout(()=>dispatch(ac.login()),700);
      }else{
        setLoading(false); setP("");
        setErr("Invalid username or password"); setShake(true); setTimeout(()=>setShake(false),400);
      }
    },600);
  };

  const inputStyle={width:"100%",padding:"13px 16px",background:"rgba(255,255,255,.04)",border:`1px solid ${shake?"rgba(248,113,113,.4)":"rgba(255,255,255,.1)"}`,borderRadius:9,color:"#fff",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:400,outline:"none",letterSpacing:.3,transition:"all .2s"};

  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 73px)",position:"relative",zIndex:5,padding:"32px 16px"}}>
      <div style={{width:"100%",maxWidth:420,background:"var(--surface)",border:"1px solid var(--border2)",overflow:"hidden",boxShadow:"0 0 60px rgba(0,0,0,.6)",animation:"boxIn .5s cubic-bezier(.34,1.56,.64,1) both",position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,var(--yellow),transparent)"}}/>
        <div style={{background:"var(--surface2)",borderBottom:"1px solid var(--border2)",padding:"28px 32px 24px",textAlign:"center"}}>
          <div style={{width:56,height:56,background:"rgba(0,170,255,.06)",border:"1px solid rgba(245,200,0,.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div style={{fontFamily:"'Oswald',sans-serif",fontSize:36,fontWeight:700,letterSpacing:8,color:"var(--cyan)"}}>SIGN IN</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"var(--blue2)",letterSpacing:3,textTransform:"uppercase",marginTop:6}}>UFIX // ATTENDANCE SYSTEM</div>
        </div>
        <div style={{padding:"28px 32px"}}>
          {err&&<div style={{background:"rgba(255,56,96,.06)",border:"1px solid rgba(255,56,96,.2)",borderRadius:8,padding:"10px 14px",color:"var(--red)",fontSize:13,fontWeight:700,marginBottom:16,display:"flex",alignItems:"center",gap:8,fontFamily:"'JetBrains Mono',monospace",animation:shake?"shake .35s ease":"none"}}>✗ {err}</div>}
          <div style={{marginBottom:18}}>
            <label style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"var(--muted2)",marginBottom:8,display:"block"}}>Username</label>
            <input type="text" value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Enter username" style={inputStyle} onFocus={e=>{e.target.style.borderColor="rgba(245,200,0,.4)";e.target.style.boxShadow="0 0 0 3px rgba(245,200,0,.08)"}} onBlur={e=>{e.target.style.borderColor="var(--border2)";e.target.style.boxShadow="none"}}/>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"var(--muted2)",marginBottom:8,display:"block"}}>Password</label>
            <div style={{position:"relative"}}>
              <input type={sp?"text":"password"} value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="Enter password" style={{...inputStyle,paddingRight:44}} onFocus={e=>{e.target.style.borderColor="rgba(245,200,0,.4)";e.target.style.boxShadow="0 0 0 3px rgba(245,200,0,.08)"}} onBlur={e=>{e.target.style.borderColor="var(--border2)";e.target.style.boxShadow="none"}}/>
              <button onClick={()=>setSp(!sp)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted2)",fontSize:16,padding:4}}>{sp?"🙈":"👁"}</button>
            </div>
          </div>
          <button onClick={doLogin} disabled={loading} style={{width:"100%",padding:14,background:granted?"rgba(74,222,128,.15)":"rgba(165,180,252,.1)",border:"1px solid",borderColor:granted?"rgba(74,222,128,.6)":"rgba(165,180,252,.4)",color:granted?"#fff":"#c7d2fe",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,letterSpacing:3,cursor:loading&&!granted?"not-allowed":"pointer",transition:"all .2s",marginTop:4,textTransform:"uppercase",borderRadius:9}}>
            {granted?"✓ ACCESS GRANTED":loading?<Spinner/>:"LOGIN"}
          </button>
        </div>
        <div style={{padding:"12px 32px 18px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"var(--muted)",letterSpacing:2,borderTop:"1px solid var(--border2)",textTransform:"uppercase"}}>UFIX HR // v2.0 // <span style={{color:"var(--blue)"}}>SYSTEM ONLINE</span></div>
      </div>
    </div>
  );
}

function HomePage({employees,dispatch}){
  const counts={"08:00":0,"16:00":0,"00:00":0};
  employees.forEach(e=>{if(counts[e.shift]!==undefined)counts[e.shift]++;});
  const SHIFTS=[
    {key:"08:00",name:"DAY",  time:"08:00 — 16:00",color:"var(--green)", shadow:"rgba(0,255,157,.08)", border:"rgba(0,255,157,.2)"},
    {key:"16:00",name:"MAIN", time:"16:00 — 00:00",color:"var(--yellow)",shadow:"rgba(245,200,0,.1)",  border:"rgba(245,200,0,.25)"},
    {key:"00:00",name:"NIGHT",time:"00:00 — 08:00",color:"var(--blue)",  shadow:"rgba(79,195,247,.08)",border:"rgba(79,195,247,.2)"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"76vh",gap:16,padding:"32px 20px",position:"relative",zIndex:1}}>
      <div style={{fontFamily:"'Oswald',sans-serif",fontSize:52,letterSpacing:6,textAlign:"center"}}>SELECT <span style={{color:"var(--yellow)"}}>SHIFT</span></div>
      <div className="shift-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,width:"100%",maxWidth:820}}>
        {SHIFTS.map(s=>{
          const [hov,setHov]=useState(false);
          return(
            <div key={s.key} className="shift-card" onClick={()=>dispatch(ac.openShift(s.key))} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
              style={{position:"relative",overflow:"hidden",background:"rgba(255,255,255,.02)",border:`1px solid ${hov?"rgba(255,255,255,.18)":"rgba(255,255,255,.07)"}`,padding:"28px 24px 22px",cursor:"pointer",transition:"all .3s cubic-bezier(.22,1,.36,1)",textAlign:"left",borderRadius:16,transform:hov?"translateY(-6px) scale(1.01)":"none",boxShadow:hov?"0 24px 48px rgba(0,0,0,.4)":"none"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${s.color},transparent)`,transform:hov?"scaleX(1)":"scaleX(0)",transformOrigin:"left",transition:"transform .3s"}}/>
              <div style={{fontSize:9,letterSpacing:4,textTransform:"uppercase",color:s.color,opacity:.8,marginBottom:14,fontWeight:500}}>{s.name==="DAY"?"Morning":s.name==="MAIN"?"Afternoon":"Overnight"}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,letterSpacing:-.5,marginBottom:4}}>{s.name.charAt(0)+s.name.slice(1).toLowerCase()}</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1,marginBottom:18}}>{s.time.replace("—","—")}</div>
              <div style={{width:hov?48:20,height:2,background:s.color,borderRadius:1,marginBottom:14,transition:"width .3s"}}></div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>{counts[s.key]} employees</div>
            </div>
          );
        })}
      </div>
      <div style={{width:"100%",maxWidth:820}}>
        {(()=>{const [hov,setHov]=useState(false);return(
          <button onClick={()=>dispatch(ac.openSchedule())} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
            style={{width:"100%",padding:15,border:`1px solid ${hov?"rgba(165,180,252,.5)":"rgba(165,180,252,.2)"}`,background:hov?"rgba(165,180,252,.1)":"rgba(165,180,252,.05)",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:600,letterSpacing:3,color:hov?"#c7d2fe":"#a5b4fc",transition:"all .25s",display:"flex",alignItems:"center",justifyContent:"center",gap:10,borderRadius:12,boxShadow:hov?"0 0 24px rgba(165,180,252,.12)":"none"}}>
            SCHEDULE
          </button>
        );})()}
      </div>
    </div>
  );
}

function ShiftPage({state,dispatch}){
  const {employees,currentShift,activeTab,selectedCI,selectedCO,cameraOpen,capturedBlob,photoUrl,photoTaken,ciLogs,coLogs,loading}=state;
  const videoRef=useRef(null); const canvasRef=useRef(null); const streamRef=useRef(null);
  const filtered=employees.filter(e=>e.shift===currentShift);
  const TITLES={"08:00":"DAY SHIFT","16:00":"MAIN SHIFT","00:00":"NIGHT SHIFT"};
  const COLORS={"08:00":"var(--green)","16:00":"var(--yellow)","00:00":"var(--blue)"};

  const toast=useCallback((msg,type)=>{dispatch(ac.showToast(msg,type));setTimeout(()=>dispatch(ac.hideToast()),3000);},[dispatch]);
  const log=(type,msg,sub,panel)=>dispatch(panel==="ci"?ac.addCILog(mkLog(type,msg,sub)):ac.addCOLog(mkLog(type,msg,sub)));

  const stopCam=useCallback(()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}dispatch(ac.closeCamera());},[dispatch]);
  useEffect(()=>()=>{if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());},[]);

  const openCam=useCallback(async()=>{
    dispatch(ac.openCamera());
    try{const s=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:"user"},audio:false});streamRef.current=s;if(videoRef.current)videoRef.current.srcObject=s;}
    catch(e){log("error","Camera denied",e.message,"ci");toast("Camera access denied","error");dispatch(ac.closeCamera());}
  },[dispatch]);

  const takePhoto=()=>{const v=videoRef.current,c=canvasRef.current;c.width=v.videoWidth||640;c.height=v.videoHeight||480;c.getContext("2d").drawImage(v,0,0);c.toBlob(blob=>dispatch(ac.setPhoto(blob,URL.createObjectURL(blob))),"image/jpeg",.9);};

  const startCheckin=async()=>{
    if(!selectedCI)return;
    const now=new Date(),today=DAYS[now.getDay()],emp=selectedCI;
    if(emp.off_day&&emp.off_day===today&&emp.off_day!=="None"&&emp.off_day!=="No day off"){toast("⛔ "+emp.name+" — day off today","error");return;}
    // check-in time validation on server
    await openCam();
  };

  const confirmCheckin=async()=>{
    if(!capturedBlob||!selectedCI)return;
    dispatch(ac.setLoading(true));
    const now=new Date(),timeStr=now.toTimeString().slice(0,5),emp=selectedCI;
    const late=calcLate(emp,now),lateStr=formatLate(late);
    try{
      const fd=new FormData();fd.append("employee_id",emp.id);fd.append("photo",capturedBlob,"checkin.jpg");
      const r=await fetch(SERVER+"/checkin",{method:"POST",body:fd});const d=await r.json();
      if(r.ok&&d.ok){log("success",emp.name+" checked in",timeStr+" · "+lateStr+(late>0?" · 💸 $"+late:""),"ci");toast("✓ "+emp.name+" checked in!","success");stopCam();dispatch(ac.checkinSuccess());}
      else throw new Error(d.error||"Server error");
    }catch{
      const cap=`🟢 CHECK-IN\n\n👤 ${emp.name} ${emp.id}\n📋 Shift: ${SHIFT_LABELS[emp.shift]}\n🕒 Time: ${timeStr}\n${lateStr}\n💸 Fine today: $${late}`;
      if(await sendPhotoTelegram(capturedBlob,cap)){log("success",emp.name+" checked in (direct)",timeStr,"ci");toast("✓ "+emp.name+" checked in!","success");stopCam();dispatch(ac.checkinSuccess());}
      else{log("error","Failed to send","Check server","ci");toast("Connection error","error");dispatch(ac.setLoading(false));}
    }
  };

  const doCheckout=async()=>{
    if(!selectedCO)return;
    const emp=selectedCO,now=new Date(),timeStr=now.toTimeString().slice(0,5);
    // checkout time validation on server
    dispatch(ac.setLoading(true));
    try{
      const r=await fetch(SERVER+"/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:emp.id})});const d=await r.json();
      if(r.ok&&d.ok){log("success",emp.name+" checked out",timeStr,"co");toast("✓ "+emp.name+" checked out","success");}
      else throw new Error(d.error);
    }catch{
      const{end}=getShiftTimes(emp,now),em=now<end?Math.floor((end-now)/60000):0;
      await sendMsgTelegram(`🔴 CHECK-OUT\n\n👤 ${emp.name} ${emp.id}\n📋 Shift: ${SHIFT_LABELS[emp.shift]}\n🕒 Time: ${timeStr}`+(em>0?"\n⚠️ Left "+formatDur(em)+" early!":""));
      log("success",emp.name+" checked out (direct)",timeStr,"co");toast("✓ "+emp.name+" checked out","success");
    }
    dispatch(ac.checkoutSuccess());
  };

  return(
    <div className="page-pad" style={{padding:32,maxWidth:1200,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <button onClick={()=>{stopCam();dispatch(ac.goHome());}} style={{padding:"10px 20px",border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.07)",borderRadius:9,fontSize:11,fontWeight:600,letterSpacing:2,color:"#fff",cursor:"pointer",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>← Back</button>
        <div style={{fontFamily:"'Oswald',sans-serif",fontSize:36,fontWeight:700,letterSpacing:6,color:COLORS[currentShift]}}>{TITLES[currentShift]}</div>
      </div>
      <div style={{display:"flex",marginBottom:28,background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:10,padding:4}}>
        {["checkin","checkout"].map(tab=>(
          <button key={tab} onClick={()=>dispatch(ac.setTab(tab))} style={{flex:1,padding:10,border:activeTab===tab?(tab==="checkin"?"1px solid rgba(74,222,128,.3)":"1px solid rgba(248,113,113,.3)"):"none",background:activeTab===tab?(tab==="checkin"?"rgba(74,222,128,.12)":"rgba(248,113,113,.12)"):"transparent",color:activeTab===tab?(tab==="checkin"?"#4ade80":"#f87171"):"rgba(255,255,255,.3)",fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .25s",letterSpacing:2,textTransform:"uppercase",borderRadius:8}}>
            {tab==="checkin"?"Check-In":"Check-Out"}
          </button>
        ))}
      </div>

      {activeTab==="checkin"&&(
        <div>
          <EmpGrid employees={filtered} selectedId={selectedCI?.id} onSelect={emp=>{dispatch(ac.selectCI(emp));log("info","Selected: "+emp.name+" "+emp.id,SHIFT_LABELS[emp.shift],"ci");}}/>
          <div style={{display:"flex",gap:12,marginBottom:24}}><Btn variant="green" disabled={!selectedCI||loading} onClick={startCheckin}>CHECK-IN</Btn></div>
          {cameraOpen&&(
            <div style={{background:"var(--surface)",border:"1px solid var(--border2)",overflow:"hidden",marginBottom:24}}>
              <div style={{padding:"14px 20px",borderBottom:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--surface2)"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"var(--yellow)",letterSpacing:2,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:8,height:8,background:"var(--red)",borderRadius:"50%",display:"inline-block",animation:"blink 1s infinite"}}/>SELFIE VERIFICATION
                </div>
                <Btn variant="ghost" onClick={stopCam} style={{padding:"6px 14px",fontSize:12}}>CANCEL</Btn>
              </div>
              {!photoTaken?<video ref={videoRef} autoPlay playsInline muted style={{width:"100%",maxHeight:400,objectFit:"cover",display:"block",background:"#000"}}/>:<img src={photoUrl} alt="captured" style={{width:"100%",maxHeight:400,objectFit:"cover",display:"block"}}/>}
              <canvas ref={canvasRef} style={{display:"none"}}/>
              <div style={{padding:"16px 20px",display:"flex",gap:10,flexWrap:"wrap",background:"var(--surface2)"}}>
                {!photoTaken&&<Btn variant="yellow" onClick={takePhoto}>TAKE PHOTO</Btn>}
                {photoTaken&&<Btn variant="ghost" onClick={()=>dispatch(ac.retakePhoto())}>RETAKE</Btn>}
                {photoTaken&&<Btn variant="green" disabled={loading} onClick={confirmCheckin}>{loading?<Spinner/>:"CONFIRM"}</Btn>}
              </div>
            </div>
          )}
          <LogBox title="ACTIVITY LOG" logs={ciLogs}/>
        </div>
      )}

      {activeTab==="checkout"&&(
        <div>
          <EmpGrid employees={filtered} selectedId={selectedCO?.id} onSelect={emp=>dispatch(ac.selectCO(emp))}/>
          <div style={{display:"flex",gap:12,marginBottom:24}}><Btn variant="red" disabled={!selectedCO||loading} onClick={doCheckout}>{loading?<Spinner color="#fff"/>:"CHECK-OUT"}</Btn></div>
          <LogBox title="CHECKOUT LOG" logs={coLogs}/>
        </div>
      )}
    </div>
  );
}

function SchedulePage({employees,dispatch}){
  const now=new Date(),todayName=DAYS[now.getDay()];
  const [saving,setSaving]=useState(null); // emp.id being saved
  const [localEmps,setLocalEmps]=useState(employees);

  // sync when parent employees change
  useEffect(()=>setLocalEmps(employees),[employees]);

  const SHIFTS=[
    {key:"08:00",label:"Day",  time:"08:00 – 16:00",color:"var(--green)"},
    {key:"16:00",label:"Main", time:"16:00 – 00:00",color:"var(--yellow)"},
    {key:"00:00",label:"Night",time:"00:00 – 08:00",color:"var(--blue)"},
  ];

  async function setOffDay(emp, day){
    // toggle: click same day again → remove off day
    const newDay = (emp.off_day===day) ? "No day off" : day;
    setSaving(emp.id);
    try{
      const res = await fetch(SERVER+"/update_offday", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({employee_id: emp.id, off_day: newDay})
      });
      if(res.ok){
        setLocalEmps(prev=>prev.map(e=>e.id===emp.id?{...e,off_day:newDay}:e));
      }
    }catch(e){console.error(e);}
    setSaving(null);
  }

  const thBase={background:"var(--surface2)",padding:"13px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:12,letterSpacing:2,textTransform:"uppercase",borderBottom:"1px solid var(--border2)",textAlign:"center"};
  return(
    <div className="page-pad" style={{padding:32,maxWidth:1200,margin:"0 auto",position:"relative",zIndex:1}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
        <button onClick={()=>dispatch(ac.goHome())} style={{padding:"10px 20px",border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.07)",borderRadius:9,fontSize:11,fontWeight:600,letterSpacing:2,color:"#fff",cursor:"pointer",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>← Back</button>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:36,fontWeight:800,color:"#fff",letterSpacing:-0.5}}>Schedule</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:2,marginTop:2}}>{MONTHS_FULL[now.getMonth()]} {now.getFullYear()}</div>
        </div>
      </div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--muted2)",letterSpacing:1,marginBottom:20,paddingLeft:4}}>
        Click any day cell to toggle off day
      </div>
      <div style={{overflowX:"auto",border:"1px solid var(--border2)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
          <thead>
            <tr>
              <th style={{...thBase,textAlign:"left",paddingLeft:20,width:160,color:"var(--muted2)"}}>Employee</th>
              <th style={{...thBase,width:80,color:"var(--muted2)"}}>ID</th>
              {WEEK_DAYS.map(d=><th key={d} style={{...thBase,background:d===todayName?"rgba(245,200,0,.07)":"var(--surface2)",color:d===todayName?"var(--yellow)":"var(--muted2)"}}>{d.slice(0,3)}</th>)}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map(shift=>{
              const group=localEmps.filter(e=>e.shift===shift.key);
              if(!group.length)return null;
              return[
                <tr key={"g"+shift.key}><td colSpan={9} style={{background:"var(--surface)",padding:"10px 20px",borderTop:"2px solid var(--border2)",borderBottom:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"'Oswald',sans-serif",fontSize:18,letterSpacing:3,display:"flex",alignItems:"center",gap:10,color:shift.color}}>{shift.label} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--muted2)",letterSpacing:1}}>{shift.time}</span></div>
                </td></tr>,
                ...group.map(emp=>{
                  const off=emp.off_day&&emp.off_day!=="None"&&emp.off_day!=="No day off"?emp.off_day:null;
                  const isSaving=saving===emp.id;
                  return(
                    <tr key={emp.id} style={{borderBottom:"1px solid var(--border)"}}>
                      <td style={{padding:"11px 10px 11px 24px"}}><span style={{fontSize:15,fontWeight:700}}>{emp.name}</span></td>
                      <td style={{padding:"11px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#fff"}}>{emp.id}</td>
                      {WEEK_DAYS.map(day=>{
                        const isOff=off===day;
                        const isToday=day===todayName;
                        return(
                          <td key={day}
                            onClick={()=>!isSaving&&setOffDay(emp,day)}
                            title={isOff?"Click to remove OFF day":"Click to set as OFF day"}
                            style={{
                              padding:"11px 10px",textAlign:"center",
                              background:isToday?"rgba(245,200,0,.03)":"transparent",
                              cursor:isSaving?"wait":"pointer",
                              transition:"background .15s"
                            }}
                            onMouseEnter={e=>{if(!isSaving)e.currentTarget.style.background=isToday?"rgba(0,170,255,.1)":"rgba(255,255,255,.04)";}}
                            onMouseLeave={e=>{e.currentTarget.style.background=isToday?"rgba(245,200,0,.03)":"transparent";}}
                          >
                            {isSaving
                              ? <span style={{color:"var(--muted2)",fontSize:11}}>...</span>
                              : isOff
                                ? <span style={{background:"rgba(255,56,96,.15)",color:"var(--red)",fontFamily:"'Oswald',sans-serif",fontSize:14,letterSpacing:2,borderRadius:6,padding:"4px 0",display:"inline-block",width:46,border:"1px solid rgba(255,56,96,.35)",boxShadow:"0 0 8px rgba(255,56,96,.2)"}}>OFF</span>
                                : <span style={{color:"rgba(255,255,255,.08)",fontSize:18,lineHeight:1}}>·</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ROOT — Redux store (useReducer) + routing
// ════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [state,dispatch]=useReducer(reducer,initialState);

  // Rehydrate auth
  useEffect(()=>{if(localStorage.getItem("ufix_auth")==="1")dispatch(ac.login());},[]);

  // Fetch employees every 5s
  useEffect(()=>{
    if(!state.isAuthenticated)return;
    const load=async()=>{try{const r=await fetch(SERVER+"/employees");if(r.ok){const d=await r.json();dispatch(ac.setEmployees(d));}}catch{}};
    load(); const id=setInterval(load,5000); return()=>clearInterval(id);
  },[state.isAuthenticated]);

  return(
    <>
      <style>{CSS}</style>
      <GlowOrb/>
      <nav className="nav-wrap" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 36px",borderBottom:"1px solid rgba(255,255,255,.07)",background:"rgba(2,4,8,.8)",backdropFilter:"blur(24px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"linear-gradient(135deg,#6366f1,#ec4899)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:9,fontWeight:700,color:"#fff",boxShadow:"0 0 20px rgba(99,102,241,.5)"}}>UF</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,letterSpacing:2,color:"#fff"}}>UFIX HR</div>
            <div style={{fontSize:9,letterSpacing:4,color:"rgba(255,255,255,.25)",textTransform:"uppercase"}}>Attendance</div>
          </div>
        </div>
        <LiveClock/>
        {state.isAuthenticated
          ?<button onClick={()=>{localStorage.removeItem("ufix_auth");dispatch(ac.logout());}} style={{padding:"9px 20px",border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.07)",borderRadius:8,fontSize:11,fontWeight:600,letterSpacing:2,color:"#fff",cursor:"pointer",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all .2s"}}>Logout</button>
          :<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"var(--muted2)",letterSpacing:2,textAlign:"right"}}>SYSTEM<br/><span style={{color:"var(--green)",textShadow:"0 0 8px var(--green)"}}>ONLINE</span></div>
        }
      </nav>

      {!state.isAuthenticated&&<LoginPage dispatch={dispatch}/>}
      {state.isAuthenticated&&state.page==="home"&&<HomePage employees={state.employees} dispatch={dispatch}/>}
      {state.isAuthenticated&&state.page==="shift"&&<ShiftPage state={state} dispatch={dispatch}/>}
      {state.isAuthenticated&&state.page==="schedule"&&<SchedulePage employees={state.employees} dispatch={dispatch}/>}
      <Toast toast={state.toast}/>
    </>
  );
}
