import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

import { isAuthorized } from "../auth/auth.middleware.js";

import {
  extendReturnDate,
  lendBook,
  returnBook,
} from "./book-lendings.controllers.js";
import { checkIfUserIsActive } from "../users/users.middleware.js";

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
    preHandler: [checkIfUserIsActive, isAuthorized],
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
    preHandler: [checkIfUserIsActive, isAuthorized],
    handler: extendReturnDate,
  });

  app.route({
    url: `${baseUrl}/return-book`,
    method: "POST",
    preHandler: [checkIfUserIsActive, isAuthorized],
    schema: {
      description: "Return a lent book",
      tags: ["book-lendings"],
      body: {
        type: "object",
        properties: {
          userId: { type: "string" },
          bookId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: returnBook,
  });

  done();
});
