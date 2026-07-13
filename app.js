import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import router from "./src/Routes/route.js"

dotenv.config()

const app = express()

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.use(router)
app.use((err, req, res, next) => {
  console.error("UPLOAD ERROR:");
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message,
  });
});

export default app