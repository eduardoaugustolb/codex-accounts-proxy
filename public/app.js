// Static browser connector. No account data or capability is sent to hosting.
let endpoint,
  busy = false,
  timer,
  reconnecting = false;
const storageKey = "codex-accounts-local-endpoint";
function parseEndpoint(value) {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[a-zA-Z0-9_-]{22,128}\/$/.test(url.pathname)
  )
    throw new Error("Use the private http://127.0.0.1 address printed by codex-accounts panel.");
  return url;
}
function localURL(value) {
  const url = new URL(value, endpoint);
  if (url.origin !== endpoint.origin || !url.pathname.startsWith(endpoint.pathname))
    throw new Error("Unexpected local endpoint.");
  return url;
}
function status(message) {
  const el = document.querySelector("#connection-status, #hosted-status");
  if (el) el.textContent = message;
}
function applyView() {
  const sections = { accounts: "Contas", preferences: "Preferências", session: "Sessão" };
  const key = location.hash.slice(1);
  const selected = Object.hasOwn(sections, key) ? key : "accounts";
  document.body.dataset.view = selected;
  for (const link of document.querySelectorAll("[data-nav]"))
    link.toggleAttribute("aria-current", link.dataset.nav === selected);
  const title = document.querySelector("[data-section-title]");
  if (title) title.textContent = sections[selected];
}
function mount(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc.querySelector('input[name="csrf"]') || !doc.querySelector("main"))
    throw new Error("Backend is incompatible. Update Codex Accounts and restart the backend.");
  doc.querySelectorAll("script,iframe,object,embed,base,link,meta").forEach((el) => {
    el.remove();
  });
  for (const el of doc.querySelectorAll("*")) {
    for (const attr of [...el.attributes])
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
  }
  for (const form of doc.querySelectorAll("form"))
    form.action = localURL(form.getAttribute("action")).href;
  for (const img of doc.querySelectorAll('img[src^="/"]'))
    img.src = localURL(img.getAttribute("src")).href;
  for (const a of doc.querySelectorAll("a")) {
    if (a.dataset.nav) a.href = "#" + a.dataset.nav;
    else if (a.hasAttribute("data-panel-base")) a.href = endpoint.href;
    else if (a.getAttribute("href")?.startsWith("/"))
      a.href = localURL(a.getAttribute("href")).href;
  }
  document.querySelector("#local-panel-style")?.remove();
  const style = document.createElement("style");
  style.id = "local-panel-style";
  style.textContent = [...doc.querySelectorAll("style")].map((el) => el.textContent).join("\n");
  document.head.append(style);
  document.body.replaceChildren(...doc.body.childNodes);
  const bar = document.createElement("div");
  bar.id = "hosted-connection";
  const text = document.createElement("span");
  text.id = "hosted-status";
  text.role = "status";
  text.textContent = "Connected to this device";
  const fallback = document.createElement("a");
  fallback.href = endpoint.href;
  fallback.textContent = "Local panel";
  fallback.referrerPolicy = "no-referrer";
  const disconnect = document.createElement("button");
  disconnect.id = "disconnect";
  disconnect.textContent = "Disconnect";
  bar.append(text, fallback, disconnect);
  document.body.append(bar);
  applyView();
}
async function request(url, options = {}) {
  const response = await fetch(localURL(url), {
    ...options,
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    targetAddressSpace: "loopback",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Backend restarted or pairing expired. Run codex-accounts panel again."
        : `Local backend returned ${response.status}.`,
    );
  return response.text();
}
async function refresh(force = false) {
  if (busy || !endpoint) return;
  if (
    !force &&
    (document.hidden ||
      !document.hasFocus() ||
      document.querySelector("details[open]") ||
      document.activeElement?.closest("form"))
  )
    return;
  busy = true;
  try {
    const url = new URL("live", endpoint);
    if (force) url.searchParams.set("fresh", "1");
    mount(await request(url));
    reconnecting = false;
  } catch (error) {
    status(error.message + " Check local-network permission or use the local panel.");
    reconnecting = true;
  } finally {
    busy = false;
  }
}
async function connect(value) {
  try {
    endpoint = parseEndpoint(value);
    status("Connecting to this device…");
    mount(await request(endpoint));
    try {
      sessionStorage.setItem(storageKey, endpoint.href);
    } catch {}
    clearInterval(timer);
    timer = setInterval(() => {
      if (!document.hidden && document.hasFocus()) void refresh(reconnecting);
    }, 3000);
    await refresh(true);
  } catch (error) {
    status(error.message + " Start the backend and allow browser access to this device.");
  }
}
document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "connect-form") {
    await connect(document.querySelector("#endpoint").value.trim());
    return;
  }
  if (!endpoint || busy) return;
  busy = true;
  try {
    mount(await request(form.action, { method: "POST", body: new FormData(form) }));
  } catch (error) {
    status(error.message);
  } finally {
    busy = false;
  }
});
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("#disconnect")) {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    location.replace("/");
    return;
  }
  if (event.target.closest("[data-panel-base]")) {
    event.preventDefault();
    void refresh(true);
  }
  if (event.target.closest("[data-sidebar-close],[data-nav]")) delete document.body.dataset.sidebar;
  if (event.target.closest("[data-sidebar-toggle]"))
    document.body.dataset.sidebar = document.body.dataset.sidebar === "open" ? "" : "open";
});
window.addEventListener("hashchange", applyView);
window.addEventListener("focus", () => refresh(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void refresh(true);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") delete document.body.dataset.sidebar;
});
const params = new URLSearchParams(location.hash.slice(1));
const compact = /^#([0-9]{1,5})\.([a-zA-Z0-9_-]{22,128})$/.exec(location.hash);
const pairing = compact ? `http://127.0.0.1:${compact[1]}/${compact[2]}/` : params.get("connect");
if (pairing) {
  history.replaceState(null, "", "/");
  void connect(pairing);
} else {
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) void connect(saved);
  } catch {}
}
