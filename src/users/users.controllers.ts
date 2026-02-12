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
  UserRegistrationRequestBody,
} from "./users.types.js";
import { StatusCodes } from "../enums/status-codes.js";
import { StatusDescriptions } from "../enums/status-descriptions.js";
import { ResponseMessages } from "../enums/response-messages.js";

export async function login(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { username, password } = req.body as UserLoginRequestBody;

  try {
    const queryResponse = await this.database.query(
      `
        SELECT
          u.id, u.username, u.password, u.first_name, u.last_name,
          u.email, u.mobile, u.role, u.is_active
        FROM users u WHERE username = $1`,
      [username.trim()],
    );

    const user = queryResponse.rows[0] as User;

    if (!user) {
      return rep.code(StatusCodes.NOT_FOUND).send({
        code: StatusCodes.NOT_FOUND,
        status: StatusDescriptions.NOT_FOUND,
        message: ResponseMessages.USER_NOT_FOUND_404,
      });
    }

    if (!user.is_active) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: ResponseMessages.INACTIVE_USER_400,
      });
    }

    if (
      !user.password ||
      !(user.password && (await bcrypt.compare(password, user.password)))
    ) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: ResponseMessages.INVALID_PASSWORD_400,
      });
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
      .code(StatusCodes.OK)
      .setCookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: config.getIsProductionEnvironment(),
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      })
      .send({
        code: StatusCodes.OK,
        status: StatusDescriptions.OK,
        data: {
          accessToken,
          user: {
            id: user.id,
          },
        },
      });
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

    rep.code(StatusCodes.CREATED).send({
      code: StatusCodes.CREATED,
      status: StatusDescriptions.CREATED,
      message: ResponseMessages.USER_HAS_BEEN_REGISTERED_201,
    });
  } catch (error) {
    console.log(error);
    rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: ResponseMessages.USER_REGISTRATION_ERROR_500,
    });
  }
}

export async function refresh(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken) {
    return rep.code(StatusCodes.UNAUTHORIZED).send({
      code: StatusCodes.UNAUTHORIZED,
      status: StatusDescriptions.UNAUTHORIZED,
      message: ResponseMessages.UNAUTHORIZED_401,
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
      return rep.code(StatusCodes.UNAUTHORIZED).send({
        code: StatusCodes.UNAUTHORIZED,
        status: StatusDescriptions.UNAUTHORIZED,
        message: ResponseMessages.UNAUTHORIZED_INVALID_TOKEN_401,
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

      return rep.code(StatusCodes.UNAUTHORIZED).send({
        code: StatusCodes.UNAUTHORIZED,
        status: StatusDescriptions.UNAUTHORIZED,
        message: ResponseMessages.TOKEN_EXPIRED_401,
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

    rep.code(StatusCodes.OK).send({
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      data: {
        accessToken,
      },
      message: ResponseMessages.TOKEN_CREATED_200,
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
    return rep.code(StatusCodes.BAD_REQUEST).send({
      code: StatusCodes.BAD_REQUEST,
      status: StatusDescriptions.BAD_REQUEST,
      message: ResponseMessages.MISSING_REFRESH_TOKEN_400,
    });
  }

  try {
    const response = (await this.database.query(
      `SELECT rt.id, rt.is_revoked FROM refresh_tokens rt WHERE rt.token = $1`,
      [refreshToken],
    )) as QueryResult<RefreshTokenData>;

    const tokenData = response.rows[0];

    if (tokenData && tokenData.is_revoked) {
      return rep.code(StatusCodes.UNAUTHORIZED).send({
        code: StatusCodes.UNAUTHORIZED,
        status: StatusDescriptions.UNAUTHORIZED,
        message: ResponseMessages.USER_NOT_SIGNED_IN_401,
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
      .code(StatusCodes.OK)
      .clearCookie("refresh_token", {
        httpOnly: true,
        secure: config.getIsProductionEnvironment(),
        sameSite: "strict",
        path: "/",
      })
      .send({
        code: StatusCodes.OK,
        status: StatusDescriptions.OK,
        message: ResponseMessages.USER_SIGNED_OUT_200,
      });
  } catch (error) {
    console.log(error);
    throw error;
  }
}
