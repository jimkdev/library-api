import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import pg from "pg";

import AppConfig from "./config.js";
import userRoutes from "./users/routes.js";
import database from "./database/pool.js";

dotenv.config();

declare module "fastify" {
  interface FastifyInstance {
    database: pg.Pool;
  }
}

const app = fastify();
const config = AppConfig.getInstance();

app.register(cors);
app.register(database);
app.register(userRoutes);

app.listen({ host: config.getHost(), port: config.getPort() }, () => {
  console.log(`App is running on port ${config.getPort()}`);
});
