import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  User,
  UserLoginRequestBody,
  UserRegistrationRequestBody,
} from "../types/users.js";
import {
  findUserByEmail,
  findUserByPhoneNumber,
  findUserByUsername,
} from "../middleware/users.js";
import AppConfig from "../config.js";

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
      body: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string" },
          password: { type: "string" },
        },
      },
      response: {
        // 400: {
        //   type: "object",
        //   properties: {
        //     code: { type: "number" },
        //     status: { type: "string" },
        //     message: { type: "string" },
        //   },
        // },
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
    handler: async function (req: FastifyRequest, rep: FastifyReply) {
      const { username, password } = req.body as UserLoginRequestBody;

      const queryResponse = await this.database.query(
        `SELECT u.id, u.username, u.password, u.first_name, u.last_name, u.email, u.mobile, u.role FROM users u WHERE username = $1`,
        [`${username.trim()}`],
      );

      const user = queryResponse.rows[0] as User;

      if (!user) {
        return rep
          .code(404)
          .type("application/json")
          .send(
            JSON.stringify({
              code: 404,
              status: "Not found",
              message: "User not found!",
            }),
          );
      }

      if (
        !user.password ||
        !(user.password && (await bcrypt.compare(password, user.password)))
      ) {
        return rep
          .code(400)
          .type("application/json")
          .send(
            JSON.stringify({
              code: 400,
              status: "Bad request",
              message: "Invalid username or password!",
            }),
          );
      }

      // Return user without password field
      const response: User = {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        mobile: user.mobile,
      };

      const config = AppConfig.getInstance();

      const accessToken = jwt.sign(
        { userId: user.id },
        config.getJwtAccessTokenSecret(),
        {
          expiresIn: config.getJwtExpirationTime(),
        },
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        config.getJwtRefreshTokenSecret(),
      );

      rep
        .code(200)
        .type("application/json")
        .send(
          JSON.stringify({
            code: 200,
            status: "Ok",
            data: {
              accessToken,
              refreshToken,
              user: {
                ...response,
              },
            },
          }),
        );
    },
  });

  app.route({
    method: "POST",
    url: `${baseUrl}/register`,
    preHandler: [findUserByUsername, findUserByEmail, findUserByPhoneNumber],
    schema: {
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
    },
    handler: async function (req: FastifyRequest, rep: FastifyReply) {
      try {
        const { username, password, first_name, last_name, email, mobile } =
          req.body as UserRegistrationRequestBody;

        const hashedPassword = await bcrypt.hash(password, 10);

        await this.database.query(
          `INSERT INTO users(id, username, password, first_name, last_name, email, mobile) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            username.trim(),
            hashedPassword,
            first_name.trim(),
            last_name.trim(),
            email.trim(),
            mobile.trim(),
          ],
        );

        rep
          .code(201)
          .type("application/json")
          .send(
            JSON.stringify({
              code: 201,
              status: "Created",
              message: "User has been registered successfully!",
            }),
          );
      } catch (error) {
        console.log(error);
        rep
          .code(500)
          .type("application/json")
          .send(
            JSON.stringify({
              code: 500,
              status: "Internal server error",
              message: "Error on user registration!",
            }),
          );
      }
    },
  });

  done();
});
