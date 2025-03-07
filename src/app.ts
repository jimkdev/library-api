import fastify, { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import pg from "pg";

import AppConfig from "./config.js";
import userRoutes from "./api/users/routes.js";
import bookRoutes from "./api/books/routes.js";
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
app.register(bookRoutes);

app.setErrorHandler(function (
  error: FastifyError,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  console.log(error);

  rep.type("application/json").send(error);
});

app.listen({ host: config.getHost(), port: config.getPort() }, () => {
  console.log(`App is running on port ${config.getPort()}`);
});
