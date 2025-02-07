import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

import AppConfig from "./config.js";
import userRoutes from "./users/routes.js";

dotenv.config();

const app = fastify();
const config = AppConfig.getInstance();

app.register(cors);
app.register(userRoutes);

app.listen({ host: config.getHost(), port: config.getPort() }, () => {
  console.log(`App is running on port ${config.getPort()}`);
});
