import "dotenv/config";

import { createServer } from "http";
import app from "../app.js";
import connectDB from "./config/db.js";
import { initializeSocket } from "./socket/socket.js";

connectDB();

const httpServer = createServer(app);

initializeSocket(httpServer);

httpServer.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});