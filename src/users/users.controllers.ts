import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { QueryResult } from "pg";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import AppConfig from "../config.js";
import { RefreshTokenData } from "../auth/auth.types.js";

import {
  User,
  UserLoginRequestBody,
  UserLogoutRequestBody,
  UserRegistrationRequestBody,
} from "./users.types.js";

export async function login(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { username, password } = req.body as UserLoginRequestBody;

  try {
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
            message: "Invalid password!",
          }),
        );
    }

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
      [user.id, refreshToken, DateTime.now().toUTC().plus({ days: 7 }).toISO()],
    );

    rep
      .code(200)
      .type("application/json")
      .setCookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: config.getIsProductionEnvironment(),
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })
      .send(
        JSON.stringify({
          code: 200,
          status: "Ok",
          data: {
            accessToken,
          },
        }),
      );
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function register(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { username, password, firstName, lastName, email, mobile } =
      req.body as UserRegistrationRequestBody;

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.database.query(
      `INSERT INTO users(id, username, password, first_name, last_name, email, mobile) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        username.trim(),
        hashedPassword,
        firstName.trim(),
        lastName.trim(),
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
}

export async function refresh(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken) {
    return rep.code(401).type("application/json").send({
      code: 401,
      status: "Unauthorized",
      message: "Unauthorized!",
    });
  }

  const config = AppConfig.getInstance();

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

    rep.code(200).type("application/json").send({
      code: 200,
      status: "OK",
      data: {
        accessToken,
      },
      message: "A new token has been created!",
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function logout(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken || refreshToken === "") {
    return rep.code(400).type("application/json").send({
      code: 400,
      status: "Bad request",
      message: "Missing refresh token!",
    });
  }

  try {
    const response = (await this.database.query(
      `SELECT rt.id, rt.is_revoked FROM refresh_tokens rt WHERE rt.token = $1`,
      [refreshToken],
    )) as QueryResult<RefreshTokenData>;

    const tokenData = response.rows[0];

    if (tokenData && tokenData.is_revoked) {
      return rep.code(400).type("application/json").send({
        code: 400,
        status: "Bad request",
        message: "User is not signed in!",
      });
    }

    await this.database.query(
      `UPDATE refresh_tokens SET is_revoked = TRUE
           WHERE token = $1
          `,
      [refreshToken],
    );

    const config = AppConfig.getInstance();

    rep
      .code(200)
      .type("application/json")
      .clearCookie("refresh_token", {
        httpOnly: true,
        secure: config.getIsProductionEnvironment(),
        sameSite: "strict",
        path: "/",
      })
      .send({
        code: 200,
        status: "OK",
        message: "User has been signed out!",
      });
  } catch (error) {
    console.log(error);
    throw error;
  }
}
