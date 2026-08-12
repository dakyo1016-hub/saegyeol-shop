const STORAGE_KEY = "saegyeol_ai_chat_v1";
const MAX_HISTORY = 8;

const starterMessages = [
  { role: "assistant", content: "안녕하세요, 새결 AI 쇼핑 가이드 결이예요. 오늘 찾는 옷이나 메이크업 무드를 말해주세요." }
];

function readHistory() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) && parsed.length ? parsed.slice(-MAX_HISTORY) : [...starterMessages];
  } catch {
    return [...starterMessages];
  }
}

function saveHistory(messages) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function formatReply(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(\/product\.html\?id=\d+)/g, '<a href="$1">상품 보기 ↗</a>')
    .replace(/\n/g, "<br />");
}

function createChat() {
  if (document.querySelector(".ai-chat")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "ai-chat";
  wrapper.innerHTML = `
    <button class="ai-chat__launcher" type="button" aria-expanded="false" aria-controls="aiChatPanel">
      <span class="ai-chat__pulse"></span>
      <span class="ai-chat__launcher-copy"><b>AI</b><small>무엇을 찾고 있나요?</small></span>
      <span class="ai-chat__launcher-icon">↗</span>
    </button>
    <section class="ai-chat__panel" id="aiChatPanel" role="dialog" aria-label="새결 AI 쇼핑 가이드" aria-hidden="true">
      <header class="ai-chat__head">
        <div><span class="ai-chat__status"></span><p>SAEGYEOL AI</p><h2>결이에게 물어보세요.</h2></div>
        <div class="ai-chat__head-actions"><button type="button" data-chat-reset>NEW</button><button type="button" data-chat-close aria-label="AI 상담 닫기">×</button></div>
      </header>
      <div class="ai-chat__messages" role="log" aria-live="polite"></div>
      <div class="ai-chat__suggestions" aria-label="빠른 질문">
        <button type="button">오늘 입을 룩 추천</button>
        <button type="button">내 퍼스널컬러 찾기</button>
        <button type="button">배송·결제 궁금해요</button>
      </div>
      <form class="ai-chat__form">
        <label for="aiChatInput">새결 AI에게 질문</label>
        <textarea id="aiChatInput" rows="1" maxlength="800" placeholder="원하는 무드나 고민을 적어주세요"></textarea>
        <button type="submit" aria-label="질문 보내기">↑</button>
      </form>
      <p class="ai-chat__notice">AI 답변은 참고용입니다. 카드번호 등 민감정보는 입력하지 마세요.</p>
    </section>`;
  document.body.appendChild(wrapper);

  const launcher = wrapper.querySelector(".ai-chat__launcher");
  const panel = wrapper.querySelector(".ai-chat__panel");
  const messagesElement = wrapper.querySelector(".ai-chat__messages");
  const form = wrapper.querySelector(".ai-chat__form");
  const input = wrapper.querySelector("#aiChatInput");
  const sendButton = form.querySelector("button");
  let messages = readHistory();
  let pending = false;

  function renderMessages() {
    messagesElement.innerHTML = messages.map((message) => `
      <article class="ai-chat__message ai-chat__message--${message.role}">
        <span>${message.role === "assistant" ? "결이" : "나"}</span>
        <p>${formatReply(message.content)}</p>
      </article>`).join("");
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  function setOpen(isOpen) {
    wrapper.classList.toggle("is-open", isOpen);
    launcher.setAttribute("aria-expanded", String(isOpen));
    panel.setAttribute("aria-hidden", String(!isOpen));
    if (isOpen) setTimeout(() => input.focus(), 180);
  }

  async function ask(text) {
    const content = String(text || "").trim();
    if (!content || pending) return;
    pending = true;
    input.value = "";
    input.style.height = "auto";
    messages.push({ role: "user", content });
    messages = messages.slice(-MAX_HISTORY);
    renderMessages();
    saveHistory(messages);
    sendButton.disabled = true;
    messagesElement.insertAdjacentHTML("beforeend", '<article class="ai-chat__message ai-chat__message--assistant ai-chat__message--loading"><span>결이</span><p><i></i><i></i><i></i></p></article>');
    messagesElement.scrollTop = messagesElement.scrollHeight;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter((message) => message.role === "user" || message.role === "assistant"),
          pageContext: `${document.title} · ${location.pathname}${location.search}${location.hash}`
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "AI 상담 연결에 실패했습니다.");
      messages.push({ role: "assistant", content: data.reply });
    } catch (error) {
      messages.push({ role: "assistant", content: error.message || "잠시 후 다시 질문해주세요." });
    } finally {
      pending = false;
      sendButton.disabled = false;
      messages = messages.slice(-MAX_HISTORY);
      saveHistory(messages);
      renderMessages();
      input.focus();
    }
  }

  launcher.addEventListener("click", () => setOpen(!wrapper.classList.contains("is-open")));
  wrapper.querySelector("[data-chat-close]").addEventListener("click", () => setOpen(false));
  wrapper.querySelector("[data-chat-reset]").addEventListener("click", () => {
    messages = [...starterMessages];
    saveHistory(messages);
    renderMessages();
    input.focus();
  });
  wrapper.querySelectorAll(".ai-chat__suggestions button").forEach((button) => button.addEventListener("click", () => ask(button.textContent)));
  form.addEventListener("submit", (event) => { event.preventDefault(); ask(input.value); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && wrapper.classList.contains("is-open")) setOpen(false); });
  renderMessages();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createChat, { once: true });
else createChat();
