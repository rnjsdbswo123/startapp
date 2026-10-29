import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const USER_NAME = window.USER_NAME || "";
const SEARCH_ENGINE = window.SEARCH_ENGINE || "Google";
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n) => String(n).padStart(2, "0");
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- 상태 ----------
const S = {
  links: [], todos: [], tab: "today", editing: false,
  failed: {}, dragId: null, overId: null, session: null,
};

// ---------- 시계 / 인사 ----------
function tick() {
  const now = new Date(), h = now.getHours();
  $("clock").textContent = pad(h) + ":" + pad(now.getMinutes());
  $("date").textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WD[now.getDay()]}요일`;
  const hello = h >= 5 && h < 12 ? "좋은 아침" : h >= 12 && h < 18 ? "좋은 오후" : h >= 18 && h < 23 ? "좋은 저녁" : "늦은 밤이에요";
  $("greeting").textContent = USER_NAME ? `${hello}, ${USER_NAME}` : hello;
}
tick(); setInterval(tick, 5000);

// ---------- 날씨 (제주, open-meteo) ----------
const WX_ICON = {
  clear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  cloud: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11.2 3.5 3.5 0 0 0 7 18z"/></svg>',
  rain: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 8.2 3.5 3.5 0 0 0 7 15z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/></svg>',
  snow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/></svg>',
};
const WX_LABEL = { clear: "맑음", cloud: "흐림", rain: "비", snow: "눈" };
$("wx-icon").innerHTML = WX_ICON.clear;
fetch("https://api.open-meteo.com/v1/forecast?latitude=33.4996&longitude=126.5312&current=temperature_2m,weather_code&timezone=Asia%2FSeoul")
  .then((r) => r.json())
  .then((d) => {
    if (!d.current) return;
    const c = d.current.weather_code;
    const kind = c <= 1 ? "clear" : (c <= 3 || c === 45 || c === 48) ? "cloud" : ((c >= 71 && c <= 77) || c === 85 || c === 86) ? "snow" : "rain";
    $("wx-icon").innerHTML = WX_ICON[kind];
    $("wx-temp").textContent = Math.round(d.current.temperature_2m) + "°";
    $("wx-label").textContent = WX_LABEL[kind];
  })
  .catch(() => {});

// ---------- 검색 ----------
$("search").onsubmit = (e) => {
  e.preventDefault();
  const q = $("q").value.trim(); if (!q) return;
  let url;
  if (/^https?:\/\//i.test(q)) url = q;
  else if (!/\s/.test(q) && /^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(q)) url = "https://" + q;
  else url = (SEARCH_ENGINE === "Naver" ? "https://search.naver.com/search.naver?query=" : "https://www.google.com/search?q=") + encodeURIComponent(q);
  location.href = url;
};
window.addEventListener("keydown", (e) => {
  const t = e.target.tagName;
  if (e.key === "/" && t !== "INPUT" && t !== "SELECT" && t !== "TEXTAREA") { e.preventDefault(); $("q").focus(); }
});

// ---------- 테마 ----------
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  $("theme-toggle").textContent = t === "dark" ? "라이트 모드" : "다크 모드";
}
let theme = "dark";
try { theme = JSON.parse(localStorage.getItem("sp.theme")) || "dark"; } catch {}
applyTheme(theme);
$("theme-toggle").onclick = () => {
  theme = theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("sp.theme", JSON.stringify(theme)); } catch {}
  applyTheme(theme);
};

// ---------- 인증 ----------
// 비밀번호 로그인 (메일 안 씀)
$("login").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim(), password = $("login-pw").value;
  if (!password) { $("auth-status").textContent = "비밀번호를 입력하세요. 아직 없으면 아래 이메일 링크로 로그인한 뒤 '비밀번호 설정'을 누르세요."; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  $("auth-status").textContent = error ? "로그인 실패: " + error.message : "";
};
// 이메일 링크 로그인 (Supabase 기본 메일은 시간당 2통 제한)
$("login-link").onclick = async () => {
  const email = $("login-email").value.trim();
  if (!email) { $("auth-status").textContent = "이메일을 입력하세요."; return; }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
  $("auth-status").textContent = error ? error.message : `${email} 로 로그인 링크를 보냈어요. 메일을 확인하세요.`;
};
$("logout").onclick = () => sb.auth.signOut();
// 로그인된 상태에서 비밀번호 지정/변경 (HTTPS로 전송, Supabase가 bcrypt로 해시 저장)
$("set-pw").onclick = () => { $("pw-form").reset(); $("pw-status").textContent = ""; $("pw-modal").classList.remove("hidden"); $("pw-new").focus(); };
$("pw-cancel").onclick = () => $("pw-modal").classList.add("hidden");
$("pw-form").onsubmit = async (e) => {
  e.preventDefault();
  const pw = $("pw-new").value, pw2 = $("pw-confirm").value;
  if (pw !== pw2) { $("pw-status").textContent = "비밀번호가 서로 달라요."; return; }
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) { $("pw-status").textContent = "실패: " + error.message; return; }
  $("pw-modal").classList.add("hidden");
  toast("비밀번호가 설정됐어요. 이제 어느 PC에서든 이메일 + 비밀번호로 로그인하세요.");
};
const DEMO = new URLSearchParams(location.search).has("demo");
const DEMO_ONE = new URLSearchParams(location.search).get("demo") === "1";
if (DEMO) {
  // ?demo : 로그인 없이 샘플 데이터로 화면만 미리보기 (저장 안 됨)
  S.session = { user: { email: "demo" } };
  S.links = [
    ["업무", "ERP", "https://erp.example.com"], ["업무", "그룹웨어", "https://gw.example.com"],
    ["구글", "Gmail", "https://mail.google.com"], ["구글", "캘린더", "https://calendar.google.com"], ["구글", "드라이브", "https://drive.google.com"],
    ["개발", "GitHub", "https://github.com"], ["개발", "Claude", "https://claude.ai"],
    ["일상", "유튜브", "https://www.youtube.com"], ["일상", "네이버", "https://www.naver.com"],
  ].filter((x) => !DEMO_ONE || x[0] === "구글").map(([group_name, title, url], i) => ({ id: "l" + i, group_name, title, url, position: i }));
  S.todos = [
    ["농장ERP 입고 데이터 확인", false, "today"], ["트립팜스 예약 문의 답장", false, "today"], ["주간 회의 자료 정리", true, "today"], ["서버 백업 스크립트 점검", false, "week"],
  ].map(([text, done, list], i) => ({ id: "t" + i, text, done, list, position: i }));
  $("who").textContent = "미리보기";
} else {
  sb.auth.onAuthStateChange((_e, session) => onSession(session));
  sb.auth.getSession().then(({ data }) => onSession(data.session));
}

async function onSession(session) {
  S.session = session;
  $("auth").classList.toggle("hidden", !!session);
  $("logout").classList.toggle("hidden", !session);
  $("set-pw").classList.toggle("hidden", !session);
  $("who").textContent = session ? session.user.email : "";
  if (!session) { S.links = []; S.todos = []; stopRealtime(); render(); return; }
  await loadAll();
  startRealtime();
}

// ---------- 데이터 ----------
async function loadAll() {
  const [l, t] = await Promise.all([
    sb.from("links").select("*").order("position").order("created_at"),
    sb.from("todos").select("*").order("position").order("created_at"),
  ]);
  if (l.error) toast(l.error.message); else S.links = l.data;
  if (t.error) toast(t.error.message); else S.todos = t.data;
  render();
}

let channel = null;
function startRealtime() {
  if (channel) return;
  channel = sb.channel("sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "links" }, loadAll)
    .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, loadAll)
    .subscribe();
}
function stopRealtime() { if (channel) { sb.removeChannel(channel); channel = null; } }

// ---------- 즐겨찾기 ----------
function groupsOf(links) {
  const map = new Map();
  for (const l of links) {
    const g = l.group_name || "기타";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(l);
  }
  return [...map].map(([name, links]) => ({ name, links }));
}

function renderGroups() {
  const groups = groupsOf(S.links);
  const box = $("groups");
  box.classList.toggle("wide", groups.length > 4);
  if (!groups.length) {
    box.innerHTML = `<div class="groups-empty">${S.session ? "즐겨찾기가 없어요. 아래 '즐겨찾기 편집'으로 추가하세요." : ""}</div>`;
  } else {
    box.innerHTML = groups.map((g) => `
      <div class="group">
        <div class="group-head"><span class="group-name">${esc(g.name)}</span>${S.editing ? `<button type="button" class="group-del" data-delgroup="${esc(g.name)}" title="그룹 삭제">그룹 삭제</button>` : `<span class="group-count">${g.links.length}</span>`}</div>
        <div class="group-links">${g.links.map(linkRow).join("")}</div>
      </div>`).join("");
  }
  // 그룹 선택 옵션
  const sel = $("f-group"), cur = sel.value;
  sel.innerHTML = groups.map((g) => `<option value="${esc(g.name)}">${esc(g.name)}</option>`).join("") + `<option value="__new">+ 새 그룹</option>`;
  sel.value = [...sel.options].some((o) => o.value === cur) ? cur : (groups[0] ? groups[0].name : "__new");
  $("f-newgroup").classList.toggle("hidden", sel.value !== "__new");
}

function linkRow(l) {
  const host = hostOf(l.url);
  const failed = S.failed[host] || !host;
  const icon = failed
    ? `<span class="initial">${esc((l.title || "?").slice(0, 1).toUpperCase())}</span>`
    : `<img src="https://icons.duckduckgo.com/ip3/${esc(host)}.ico" alt="" data-host="${esc(host)}" />`;
  const del = S.editing ? `<button type="button" class="link-del" data-del="${l.id}" title="삭제">×</button>` : "";
  return `<div class="link-row"><a class="link" href="${esc(l.url)}">${icon}<span class="name">${esc(l.title)}</span></a>${del}</div>`;
}

$("groups").addEventListener("error", (e) => {
  const host = e.target.dataset && e.target.dataset.host;
  if (host) { S.failed[host] = true; renderGroups(); }
}, true);

$("groups").onclick = async (e) => {
  const gbtn = e.target.closest("[data-delgroup]");
  if (gbtn) {
    const name = gbtn.dataset.delgroup;
    const ids = S.links.filter((l) => (l.group_name || "기타") === name).map((l) => l.id);
    if (!confirm(`"${name}" 그룹의 링크 ${ids.length}개를 모두 삭제할까요?`)) return;
    S.links = S.links.filter((l) => !ids.includes(l.id)); renderGroups();
    const { error } = await sb.from("links").delete().in("id", ids);
    if (error) { toast(error.message); loadAll(); }
    return;
  }
  const btn = e.target.closest("[data-del]"); if (!btn) return;
  const id = btn.dataset.del;
  S.links = S.links.filter((l) => l.id !== id); renderGroups();
  const { error } = await sb.from("links").delete().eq("id", id);
  if (error) { toast(error.message); loadAll(); }
};

$("f-group").onchange = () => $("f-newgroup").classList.toggle("hidden", $("f-group").value !== "__new");

$("add-link").onsubmit = async (e) => {
  e.preventDefault();
  const gname = ($("f-group").value === "__new" ? $("f-newgroup").value : $("f-group").value).trim();
  let url = $("f-url").value.trim();
  if (!gname || !url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const title = $("f-name").value.trim() || hostOf(url);
  const position = S.links.length ? Math.max(...S.links.map((l) => l.position)) + 1 : 0;
  const { data, error } = await sb.from("links").insert({ group_name: gname, title, url, position }).select().single();
  if (error) return toast(error.message);
  S.links.push(data);
  $("f-name").value = ""; $("f-url").value = ""; $("f-newgroup").value = "";
  renderGroups();
  $("f-group").value = gname; $("f-newgroup").classList.add("hidden");
};

$("edit-toggle").onclick = () => {
  S.editing = !S.editing;
  $("add-link").classList.toggle("hidden", !S.editing);
  $("edit-toggle").querySelector(".edit-icon").textContent = S.editing ? "✓" : "+";
  $("edit-toggle").querySelector(".edit-label").textContent = S.editing ? "편집 완료" : "즐겨찾기 편집";
  renderGroups();
};

// ---------- 할 일 ----------
function renderTodos() {
  const inTab = S.todos.filter((t) => t.list === S.tab);
  const sorted = [...inTab.filter((t) => !t.done), ...inTab.filter((t) => t.done)];
  $("todo-count").textContent = `완료 ${inTab.filter((t) => t.done).length}/${inTab.length}`;
  for (const b of $("tabs").querySelectorAll("button")) {
    const k = b.dataset.tab, left = S.todos.filter((t) => t.list === k && !t.done).length;
    b.classList.toggle("active", k === S.tab);
    b.querySelector(".tab-left").textContent = left || "";
  }
  const list = $("todo-list");
  if (!sorted.length) { list.innerHTML = `<div class="todo-empty">비어 있어요</div>`; return; }
  list.innerHTML = sorted.map((t) => `
    <div class="todo-item${t.done ? " done" : ""}${S.overId === t.id && S.dragId && S.dragId !== t.id ? " over" : ""}${S.dragId === t.id ? " dragging" : ""}"
         draggable="${!t.done}" data-id="${t.id}">
      <button type="button" class="check" data-toggle="${t.id}" aria-label="완료 전환">${t.done ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ""}</button>
      <span class="todo-text" data-toggle="${t.id}">${esc(t.text)}</span>
      <button type="button" class="todo-del" data-del="${t.id}" aria-label="삭제">×</button>
    </div>`).join("");
}

$("tabs").onclick = (e) => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  S.tab = b.dataset.tab; renderTodos();
};

$("draft").addEventListener("keydown", async (e) => {
  if (e.key !== "Enter" || e.isComposing) return;
  e.preventDefault();
  const text = $("draft").value.trim(); if (!text) return;
  const position = S.todos.length ? Math.max(...S.todos.map((t) => t.position)) + 1 : 0;
  $("draft").value = "";
  const { data, error } = await sb.from("todos").insert({ text, list: S.tab, done: false, position }).select().single();
  if (error) return toast(error.message);
  S.todos.push(data); renderTodos();
});

$("todo-list").onclick = async (e) => {
  const tg = e.target.closest("[data-toggle]"), del = e.target.closest("[data-del]");
  if (tg) {
    const t = S.todos.find((x) => x.id === tg.dataset.toggle); if (!t) return;
    t.done = !t.done; renderTodos();
    const { error } = await sb.from("todos").update({ done: t.done }).eq("id", t.id);
    if (error) { toast(error.message); loadAll(); }
  } else if (del) {
    const id = del.dataset.del;
    S.todos = S.todos.filter((x) => x.id !== id); renderTodos();
    const { error } = await sb.from("todos").delete().eq("id", id);
    if (error) { toast(error.message); loadAll(); }
  }
};

// 드래그 정렬
const list = $("todo-list");
list.addEventListener("dragstart", (e) => {
  const it = e.target.closest(".todo-item"); if (!it) return;
  e.dataTransfer.effectAllowed = "move"; S.dragId = it.dataset.id;
  it.classList.add("dragging");
});
list.addEventListener("dragover", (e) => {
  const it = e.target.closest(".todo-item"); if (!it || it.classList.contains("done")) return;
  e.preventDefault();
  if (S.overId !== it.dataset.id) {
    S.overId = it.dataset.id;
    for (const x of list.querySelectorAll(".todo-item")) x.classList.toggle("over", x.dataset.id === S.overId && S.overId !== S.dragId);
  }
});
list.addEventListener("drop", async (e) => {
  e.preventDefault();
  const { dragId, overId } = S;
  S.dragId = null; S.overId = null;
  if (!dragId || !overId || dragId === overId) return renderTodos();
  const arr = S.todos.slice();
  const from = arr.findIndex((t) => t.id === dragId), to = arr.findIndex((t) => t.id === overId);
  const [it] = arr.splice(from, 1);
  const ni = arr.findIndex((t) => t.id === overId);
  arr.splice(from < to ? ni + 1 : ni, 0, it);
  arr.forEach((t, i) => (t.position = i));
  S.todos = arr; renderTodos();
  const res = await Promise.all(arr.map((t) => sb.from("todos").update({ position: t.position }).eq("id", t.id)));
  const err = res.find((r) => r.error); if (err) { toast(err.error.message); loadAll(); }
});
list.addEventListener("dragend", () => { S.dragId = null; S.overId = null; renderTodos(); });

// ---------- 공통 ----------
function render() { renderGroups(); renderTodos(); }
let toastTimer;
function toast(msg) {
  const el = $("status"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 4000);
}
render();
