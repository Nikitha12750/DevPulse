import cors from "cors";
import express from "express";
import env from "./config/env.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevPulse server is running",
  });
});

app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
