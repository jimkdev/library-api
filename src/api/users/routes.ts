import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import {
  User,
  UserLoginRequestBody,
  UserRegistrationRequestBody,
} from "../../types/users.js";
import {
  findUserByEmail,
  findUserByPhoneNumber,
  findUserByUsername,
} from "../../middleware/users.js";
import AppConfig from "../../config.js";
import { DateTime } from "luxon";
import { QueryResult } from "pg";
import { RefreshTokenData } from "../../types/tokens.js";

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

      await this.database.query(
        `
          UPDATE refresh_tokens SET is_revoked = TRUE
          WHERE is_revoked = $1
          AND is_expired = $2
          AND user_id = $3
        `,
        [false, false, user.id],
      );

      await this.database.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [
          user.id,
          refreshToken,
          DateTime.now().toUTC().plus({ hour: 1 }).toISO(),
        ],
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

  app.route({
    method: "POST",
    url: `${baseUrl}/refresh`,
    handler: async function (req: FastifyRequest, rep: FastifyReply) {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return rep.code(401).type("application/json").send({
          code: 401,
          status: "Unauthorized",
          message: "Unauthorized!",
        });
      }

      const config = AppConfig.getInstance();

      const refreshToken = authHeader.split(" ")[1];

      try {
        const response = (await this.database.query(
          `SELECT rt.id, rt.is_revoked, rt.is_expired, rt.expires_at::text FROM refresh_tokens rt WHERE rt.token = $1`,
          [refreshToken],
        )) as QueryResult<RefreshTokenData>;

        const tokenData = response.rows[0];

        if (
          !tokenData ||
          (tokenData && (tokenData.is_revoked || tokenData.is_expired))
        ) {
          return rep.code(401).type("application/json").send({
            code: 401,
            status: "Unauthorized",
            message: "Unauthorized! (Invalid token)",
          });
        }
        const expires_at = DateTime.fromISO(
          String(tokenData["expires_at"]).replace(" ", "T") + "Z",
        );

        if (DateTime.utc() >= expires_at.toUTC()) {
          await this.database.query(
            `UPDATE refresh_tokens SET is_expired = TRUE WHERE id = $1`,
            [tokenData["id"]],
          );

          return rep.code(401).type("application/json").send({
            code: 401,
            status: "Unauthorized",
            message: "Token has expired!",
          });
        }

        const decodedToken = jwt.verify(
          refreshToken,
          config.getJwtRefreshTokenSecret(),
        ) as jwt.JwtPayload;

        const accessToken = jwt.sign(
          { userId: decodedToken.userId },
          config.getJwtAccessTokenSecret(),
          {
            expiresIn: config.getJwtExpirationTime(),
          },
        );

        return {
          accessToken,
        };
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
  });

  done();
});
