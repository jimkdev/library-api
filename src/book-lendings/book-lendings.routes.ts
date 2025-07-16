import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

import { isAuthorized } from "../auth/auth.middleware.js";

import { extendReturnDate, lendBook } from "./book-lendings.controllers.js";

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  const baseUrl = "/books/lendings";

  app.route({
    url: `${baseUrl}/create`,
    method: "POST",
    schema: {
      description: "Create a book lending",
      tags: ["book-lendings"],
      body: {
        type: "object",
        properties: {
          extensionDays: { type: "number" },
          bookLendingId: { type: "number" },
        },
      },
    },
    preHandler: [isAuthorized],
    handler: lendBook,
  });

  app.route({
    url: `${baseUrl}/extend-return-date`,
    method: "POST",
    schema: {
      description: "Extend the return date",
      tags: ["book-lendings"],
      body: {
        type: "object",
        properties: {
          extensionDays: { type: "number" },
          bookLendingId: { type: "number" },
        },
      },
    },
    preHandler: [isAuthorized],
    handler: extendReturnDate,
  });

  done();
});
