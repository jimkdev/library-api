import fastify, { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import dotenv from "dotenv";
import pg from "pg";

import AppConfig from "./config.js";
import userRoutes from "./users/users.routes.js";
import bookRoutes from "./books/books.routes.js";
import database from "./database/pool.js";
import bookLendingsRoutes from "./book-lendings/book-lendings.routes.js";
import userDecorators from "./users/users.decorators.js";
import analyticsRoutes from "./analytics/analytics.routes.js";

dotenv.config();

declare module "fastify" {
  interface FastifyInstance {
    database: pg.Pool;
  }
}

const app = fastify();
const config = AppConfig.getInstance();

await app.register(import("@fastify/swagger"), {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "API documentation",
      description: "API documentation",
      version: "0.1.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: `http://localhost:${config.getPort()}`,
        description: "Local development server",
      },
    ],
    tags: [
      { name: "users", description: "User related endpoints" },
      { name: "books", description: "Book related endpoints" },
      { name: "book-lendings", description: "Book lendings related endpoints" },
      { name: "analytics", description: "Analytics related endpoints" },
    ],
  },
});

await app.register(import("@fastify/swagger-ui"), {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
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
  // transformSpecification: (swaggerObject, req, res) => {
  //   return swaggerObject;
  // },
  transformSpecificationClone: true,
});

app.register(cors);
app.register(cookie);
app.register(database);
app.register(userDecorators);
app.register(userRoutes);
app.register(bookRoutes);
app.register(bookLendingsRoutes);
app.register(analyticsRoutes);

app.setErrorHandler(function (
  error: FastifyError,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  console.log(error);

  rep.type("application/json").send(error);
});

await app.ready();
app.swagger();

app.listen({ host: config.getHost(), port: config.getPort() }, () => {
  console.log(`App is running on port ${config.getPort()}`);
});
