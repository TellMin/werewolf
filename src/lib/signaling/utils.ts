export const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const resolveWebSocketUrl = (value: string) => {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol === "http:") {
      url.protocol = "ws:";
    } else if (url.protocol === "https:") {
      url.protocol = "wss:";
    }

    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/ws";
    }

    return url.toString();
  } catch {
    return value;
  }
};

export const resolveSignalDisplay = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return value;
  }
};
