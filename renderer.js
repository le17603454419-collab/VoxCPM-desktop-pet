const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const voiceBtn = document.getElementById("voice");
const inputDock = document.getElementById("inputDock");
const toggleChatBtn = document.getElementById("toggleChat");
const petMount = document.getElementById("petMount");
petMount.innerHTML = window.PET_THEME.template;
const pet = document.getElementById("pet");
const petSprite = document.getElementById("petSprite");
const statusText = document.getElementById("status");
const speechBubble = document.getElementById("speechBubble");
const bubbleSpeaker = document.getElementById("bubbleSpeaker");
const bubbleText = document.getElementById("bubbleText");
const { ipcRenderer } = require("electron");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
let hideBubbleTimer = null;
let idleTimer = null;

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!pet.classList.contains("thinking") && !pet.classList.contains("speaking") && !inputDock.classList.contains("open")) {
      pet.classList.add("sleeping");
      setPetSprite("sleep");
      showBubble("bot", "我先眯一会儿。", false);
    }
  }, 90000);
}

function wakePet() {
  resetIdleTimer();
  if (!pet.classList.contains("thinking") && !pet.classList.contains("speaking")) {
    setPetSprite("idle");
  }
}

function setPetSprite(state) {
  const sprites = window.PET_THEME.sprites || {};
  const nextSrc = sprites[state] || sprites.idle;
  if (!nextSrc || petSprite.getAttribute("src") === nextSrc) return;

  petSprite.style.opacity = "0";
  setTimeout(() => {
    petSprite.src = nextSrc;
    petSprite.style.opacity = "1";
  }, 80);
}

function setPetState(state, label) {
  pet.classList.remove("thinking", "speaking", "sleeping", "waving", "happy");
  if (state) pet.classList.add(state);
  setPetSprite(state || "idle");
  statusText.innerText = label;
}

function showBubble(role, text, keepVisible = true) {
  bubbleSpeaker.innerText = role === "user" ? "你" : window.PET_THEME.name;
  bubbleText.innerText = text;
  speechBubble.classList.remove("hidden", "user-bubble", "thinking-bubble");
  if (role === "user") speechBubble.classList.add("user-bubble");
  if (text.includes("想想") || text.includes("听")) speechBubble.classList.add("thinking-bubble");
  speechBubble.style.animation = "none";
  speechBubble.offsetHeight;
  speechBubble.style.animation = "";

  if (hideBubbleTimer) clearTimeout(hideBubbleTimer);
  if (!keepVisible) {
    hideBubbleTimer = setTimeout(() => {
      speechBubble.classList.add("hidden");
    }, 9000);
  }
}

function addMessage(role, text) {
  showBubble(role, text, role !== "user");
}

function showTemporaryMood(state, duration = 2600) {
  pet.classList.remove("thinking", "speaking", "sleeping", "waving", "happy");
  if (state === "wave") pet.classList.add("waving");
  if (state === "happy") pet.classList.add("happy");
  setPetSprite(state);
  setTimeout(() => {
    if (!pet.classList.contains("thinking") && !pet.classList.contains("speaking")) {
      setPetSprite("idle");
      pet.classList.remove("waving", "happy", "sleeping");
    }
  }, duration);
}

function openInput() {
  wakePet();
  inputDock.classList.add("open");
  input.focus();
}

function closeInput() {
  inputDock.classList.remove("open");
}

function stopListening() {
  if (!recognition || !listening) return;
  recognition.stop();
}

function startListening() {
  openInput();

  if (!SpeechRecognition) {
    addMessage("bot", "这个 Electron 环境暂时不支持语音识别，可以之后接入本地 Whisper。");
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      listening = true;
      voiceBtn.classList.add("listening");
      setPetState("thinking", "正在听你说");
      showBubble("bot", "我在听。", false);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      input.value = finalText || interimText;

      if (finalText) {
        stopListening();
        setTimeout(send, 120);
      }
    };

    recognition.onerror = (event) => {
      addMessage("bot", `语音识别失败：${event.error || "未知错误"}`);
      setPetState("", "在线陪伴中");
    };

    recognition.onend = () => {
      listening = false;
      voiceBtn.classList.remove("listening");
      if (!sendBtn.disabled) setPetState("", "在线陪伴中");
    };
  }

  recognition.start();
}

async function speak(text) {
  setPetState("speaking", "正在说话");

  const res = await fetch("http://127.0.0.1:8000/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    throw new Error(`语音服务返回 ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const audio = new Audio(url);
  audio.play();

  audio.onended = () => {
    URL.revokeObjectURL(url);
    setPetState("", "在线陪伴中");
  };
}

async function send() {
  wakePet();
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  sendBtn.disabled = true;
  addMessage("user", text);
  setPetState("thinking", "正在思考");
  showBubble("bot", "让我想想...", false);

  try {
    const reply = await ipcRenderer.invoke("ai-chat", text);
    addMessage("bot", reply);
    showTemporaryMood("happy");
    closeInput();
    await speak(reply);
  } catch (err) {
    addMessage("bot", `出错啦：${err.message || err}`);
    console.error(err);
    setPetState("", "在线陪伴中");
  } finally {
    sendBtn.disabled = false;
    if (inputDock.classList.contains("open")) input.focus();
  }
}

sendBtn.onclick = send;
voiceBtn.onclick = () => {
  if (listening) {
    stopListening();
  } else {
    startListening();
  }
};
pet.onclick = () => {
  wakePet();
  showTemporaryMood("wave", 2200);
  showBubble("bot", "我在呢。", false);
};

toggleChatBtn.onclick = () => {
  inputDock.classList.toggle("open");
  if (inputDock.classList.contains("open")) input.focus();
};

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") send();
  if (e.key === "Escape") closeInput();
});
resetIdleTimer();
