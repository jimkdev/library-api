import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

import { isAuthorized } from "../auth/auth.middleware.js";

import { lendBook, extendReturnDate } from "./book-lendings.controllers.js";

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  const baseUrl = "/books/lendings";

  app.route({
    url: `${baseUrl}/create`,
    method: "POST",
    preHandler: [isAuthorized],
    handler: lendBook,
  });

  app.route({
    url: `${baseUrl}/extend-return-date`,
    method: "POST",
    preHandler: [isAuthorized],
    handler: extendReturnDate,
  });

  done();
});
