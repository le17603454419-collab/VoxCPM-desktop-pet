const { app, BrowserWindow, ipcMain, session, screen, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
require("dotenv").config();
const { getLlmConfig } = require("./llmConfig");

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  const width = 360;
  const height = 500;
  const margin = 16;
  const { workArea } = screen.getPrimaryDisplay();

  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + workArea.height - height - margin,
    title: "中文桌宠",
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow = win;

  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.loadFile("index.html");
}

function getAnthropicText(data) {
  if (!Array.isArray(data.content)) return "";

  return data.content
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();
}

ipcMain.handle("ai-chat", async (_, userText) => {
  const llmConfig = getLlmConfig();

  if (!llmConfig.authToken) {
    throw new Error("缺少 ANTHROPIC_AUTH_TOKEN 或 AI_API_KEY");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), llmConfig.timeoutMs);

  try {
    const res = await fetch(`${llmConfig.baseUrl}/v1/messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${llmConfig.authToken}`,
        "anthropic-version": llmConfig.anthropicVersion
      },
      body: JSON.stringify({
        model: llmConfig.model,
        max_tokens: llmConfig.maxTokens,
        system: llmConfig.systemPrompt,
        messages: [
          {
            role: "user",
            content: userText
          }
        ],
        temperature: llmConfig.temperature
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    const text = getAnthropicText(data);
    if (!text) {
      throw new Error(`AI 响应格式异常：${JSON.stringify(data)}`);
    }

    return text;
  } finally {
    clearTimeout(timer);
  }
});


function createTray() {
  const iconPath = path.join(__dirname, "tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip("中文桌宠");

  const showWindow = () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  };

  const contextMenu = Menu.buildFromTemplate([
    { label: "显示桌宠", click: showWindow },
    { label: "隐藏桌宠", click: () => mainWindow?.hide() },
    { type: "separator" },
    {
      label: "退出桌宠",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", showWindow);
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === "media" || permission === "microphone");
  });

  createWindow();
  createTray();
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
