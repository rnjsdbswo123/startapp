import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const el = {
  auth: $("auth"), app: $("app"), links: $("links"), status: $("status"),
  who: $("who"), login: $("login"), logout: $("logout"),
  add: $("add"), addTitle: $("add-title"), addUrl: $("add-url"),
};

// ---------- 시계 ----------
function tick() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  $("date").textContent = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
}
tick(); setInterval(tick, 1000);

// ---------- 인증 ----------
el.login.onsubmit = async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  setStatus(error ? error.message : `${email} 로 로그인 링크를 보냈어요. 메일을 확인하세요.`);
};
el.logout.onclick = () => sb.auth.signOut();

sb.auth.onAuthStateChange((_event, session) => render(session));

async function render(session) {
  if (!session) {
    el.auth.classList.remove("hidden");
    el.app.classList.add("hidden");
    stopRealtime();
    return;
  }
  el.auth.classList.add("hidden");
  el.app.classList.remove("hidden");
  el.who.textContent = session.user.email;
  await loadLinks();
  startRealtime();
}

// ---------- 링크 CRUD ----------
let links = [];

async function loadLinks() {
  const { data, error } = await sb.from("links").select("*").order("position").order("created_at");
  if (error) return setStatus(error.message);
  links = data;
  drawLinks();
}

function drawLinks() {
  el.links.innerHTML = "";
  for (const l of links) {
    const host = safeHost(l.url);
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${esc(l.url)}">
        <img src="https://www.google.com/s2/favicons?sz=64&domain=${esc(host)}" alt="" />
        <span>${esc(l.title)}</span>
      </a>
      <button class="del" title="삭제" data-id="${l.id}">×</button>`;
    el.links.appendChild(li);
  }
}

el.links.onclick = async (e) => {
  const btn = e.target.closest(".del");
  if (!btn) return;
  if (!confirm("삭제할까요?")) return;
  const { error } = await sb.from("links").delete().eq("id", btn.dataset.id);
  if (error) return setStatus(error.message);
  links = links.filter((l) => l.id !== btn.dataset.id);
  drawLinks();
};

el.add.onsubmit = async (e) => {
  e.preventDefault();
  let url = el.addUrl.value.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  const row = { title: el.addTitle.value.trim(), url, position: links.length };
  const { data, error } = await sb.from("links").insert(row).select().single();
  if (error) return setStatus(error.message);
  links.push(data);
  drawLinks();
  el.add.reset();
  el.addTitle.focus();
};

// ---------- 실시간 동기화 (다른 PC에서 바꾸면 즉시 반영) ----------
let channel = null;
function startRealtime() {
  if (channel) return;
  channel = sb
    .channel("links-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "links" }, loadLinks)
    .subscribe();
}
function stopRealtime() {
  if (channel) { sb.removeChannel(channel); channel = null; }
}

// ---------- 유틸 ----------
function setStatus(msg) { el.status.textContent = msg; setTimeout(() => (el.status.textContent = ""), 4000); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function safeHost(u) { try { return new URL(u).hostname; } catch { return ""; } }

// 초기 세션 확인
sb.auth.getSession().then(({ data }) => render(data.session));
