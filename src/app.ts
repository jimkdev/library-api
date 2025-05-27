import fastify, { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import pg from "pg";

import AppConfig from "./config.js";
import userRoutes from "./users/users.routes.js";
import bookRoutes from "./books/books.routes.js";
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

await app.register(import("@fastify/swagger"), {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "API documentation",
      description: "API documentation",
      version: "0.1.0",
    },
    servers: [
      {
        url: `http://localhost:${config.getPort()}`,
        description: "Development server",
      },
    ],
  },
});

await app.register(import("@fastify/swagger-ui"), {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "none",
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function (req, rep, next) {
      next();
    },
    preHandler: function (req, rep, next) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => swaggerObject,
  transformSpecificationClone: true,
});

await app.ready();
app.swagger();

app.listen({ host: config.getHost(), port: config.getPort() }, () => {
  console.log(`App is running on port ${config.getPort()}`);
});
