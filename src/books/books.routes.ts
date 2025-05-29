import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

import { isAuthorized } from "../auth/auth.middleware.js";
import { addBooks, getBooks } from "./books.controllers.js";

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  const baseUrl = "/books";

  app.route({
    url: `${baseUrl}/add`,
    method: "POST",
    preHandler: [isAuthorized],
    schema: {
      description: "Add books",
      tags: ["books"],
      body: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "author", "isbn", "publishedAt", "quantity"],
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            isbn: { type: "string" },
            publishedAt: { type: "string" },
            quantity: { type: "number" },
          },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
        400: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            code: { type: "string" },
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
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
    handler: addBooks,
  });

  app.route({
    url: `${baseUrl}`,
    method: "GET",
    preHandler: [isAuthorized],
    schema: {
      description: "Get books",
      tags: ["books"],
      querystring: {
        type: "object",
        required: ["page", "limit"],
        properties: {
          page: { type: "number" },
          limit: { type: "string" },
        },
      },
      response: {
        400: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            code: { type: "string" },
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  title: { type: "string" },
                  author: { type: "string" },
                  isbn: { type: "string" },
                  published_at: { type: "string" },
                  is_available: { type: "boolean" },
                  quantity: { type: "number" },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                totalRecords: { type: "number" },
                currentPage: { type: "number" },
                limit: { type: "number" },
                totalPages: { type: "number" },
                nextPage: { type: "number" },
                prevPage: { type: "number" },
              },
            },
            message: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
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
    handler: getBooks,
  });

  done();
});
