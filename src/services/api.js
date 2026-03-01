const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let ws = null;

export const connectWebSocket = (
  mode,                        // "register" | "recognize"
  payload = null,              // for register: { user_name: "..." }, for recognize: can be null or omitted
  onMessage,
  onOpen = () => {},
  onClose = () => {},
  onError = () => {}
) => {
  const url =
    mode === "register"
      ? `${API_BASE_URL.replace("http", "ws")}/ws/register`
      : `${API_BASE_URL.replace("http", "ws")}/ws/recognize`;

  console.log(`[WS] Attempting to connect to: ${url}`);

  // Determine what initial payload to send
  let initialMessage = null;

  if (mode === "register") {
    if (payload && payload.user_name) {
      initialMessage = payload;
      console.log(`[WS] Register initial payload:`, initialMessage);
    } else {
      console.warn("[WS] Register mode requires { user_name: ... } – no payload sent");
    }
  } else if (mode === "recognize") {
    initialMessage = { mode: "recognize" };
    console.log(`[WS] Recognize initial payload:`, initialMessage);
  }

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log(`[WS] Connection opened successfully (${mode})`);

    if (initialMessage) {
      const messageStr = JSON.stringify(initialMessage);
      ws.send(messageStr);
      console.log(`[WS] Initial payload sent: ${messageStr}`);
    } else {
      console.log(`[WS] No initial payload required/sent`);
    }

    onOpen();
  };

  ws.onmessage = (event) => {
    const data = event.data;
    console.log(`[WS] ← received:`, data);
    onMessage(data);
  };

  ws.onclose = (event) => {
    console.log(`[WS] Connection closed`, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });
    onClose(event);
    ws = null;
  };

  ws.onerror = (error) => {
    console.error(`[WS] Error occurred:`, error);
    onError(error);
  };

  // Return cleanup function (same as before)
  return () => {
    console.log(`[WS] Cleanup called - closing connection`);
    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      ws.close(1000, "Component unmounted / manual close");
    }
    ws = null;
  };
};
export const sendFrame = (frameBase64) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(`frame:${frameBase64}`);
  }
};

export const closeWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};
// Keep old REST endpoints for admin
export const getUsers = async () => {
  const res = await fetch(`${API_BASE_URL}/users/`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const getUserById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/users/${id}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
};

export const getTodayAttendance = async () => {
  const res = await fetch(`${API_BASE_URL}/attendance/today`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

// deleteUser remains the same if you implement DELETE /users/{id} in backend later