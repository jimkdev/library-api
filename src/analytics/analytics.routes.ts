import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

import { isAuthorized } from "../auth/auth.middleware.js";

import { getAnalytics } from "./analytics.controllers.js";

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  const baseUrl = "/analytics";

  app.route({
    url: `${baseUrl}`,
    method: "GET",
    preHandler: [isAuthorized],
    schema: {
      description: "Get analytics",
      tags: ["analytics"],
      response: {
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                totalBookLendings: { type: "number" },
                totalActiveUsers: { type: "number" },
                totalAvailableBooks: { type: "number" },
              },
            },
          },
        },
        500: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: getAnalytics,
  });

  done();
});
