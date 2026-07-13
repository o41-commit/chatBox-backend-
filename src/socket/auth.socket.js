import jwt from "jsonwebtoken";


const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const [name, ...rest] = cookie.split("=");
      acc[name] = decodeURIComponent(rest.join("=")).trim();
      return acc;
    }, {});
};

 export const authenticateSocket = (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");

    const token =
      socket.handshake.auth?.token ||
      cookies.token ||
      socket.handshake.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
};