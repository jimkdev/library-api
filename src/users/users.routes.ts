import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { isAuthorized } from "../auth/auth.middleware.js";

import {
  findUserByEmail,
  findUserByPhoneNumber,
  findUserByUsername,
} from "./users.middleware.js";
import { login, logout, refresh, register } from "./users.controllers.js";

export default fp(function (
  app: FastifyInstance,
  opts,
  done: (err?: Error) => void,
) {
  const baseUrl = "/users";

  app.route({
    method: "POST",
    url: `${baseUrl}/login`,
    schema: {
      description: "User login",
      tags: ["users"],
      body: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string" },
          password: { type: "string" },
        },
      },
      response: {
        400: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            code: { type: "string" },
            status: { type: "string" },
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        404: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    username: { type: "string" },
                    first_name: { type: "string" },
                    last_name: { type: "string" },
                    email: { type: "string" },
                    mobile: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: login,
  });

  app.route({
    method: "POST",
    url: `${baseUrl}/register`,
    preHandler: [findUserByUsername, findUserByEmail, findUserByPhoneNumber],
    schema: {
      description: "User registration",
      tags: ["users"],
      body: {
        type: "object",
        required: [
          "username",
          "password",
          "first_name",
          "last_name",
          "email",
          "mobile",
        ],
        properties: {
          username: { type: "string" },
          password: { type: "string" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          mobile: { type: "string" },
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
        409: {
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
    handler: register,
  });

  app.route({
    method: "POST",
    url: `${baseUrl}/refresh`,
    schema: {
      description: "Refresh token",
      tags: ["users"],
      headers: {
        type: "object",
        required: ["authorization"],
        properties: {
          authorization: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                accessToken: { type: "string" },
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
      },
    },
    handler: refresh,
  });

  app.route({
    method: "POST",
    url: `${baseUrl}/logout`,
    preHandler: [isAuthorized],
    schema: {
      description: "User logout",
      tags: ["users"],
      headers: {
        type: "object",
        required: ["authorization"],
        properties: {
          authorization: { type: "string" },
        },
      },
      body: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string" },
        },
      },
      response: {
        400: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            code: { type: "string" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
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
      },
    },
    handler: logout,
  });

  done();
});
