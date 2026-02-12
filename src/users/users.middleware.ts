import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  User,
  UserHeaders,
  UserRegistrationRequestBody,
} from "./users.types.js";
import { StatusCodes } from "../enums/status-codes.js";
import { StatusDescriptions } from "../enums/status-descriptions.js";
import { ResponseMessages } from "../enums/response-messages.js";

export async function findUserByUsername(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { username } = req.body as UserRegistrationRequestBody;

  const response = await this.database.query<User>(
    `SELECT id FROM users u WHERE u.username LIKE $1;`,
    [`${username.trim()}`],
  );

  if (response.rowCount && response.rowCount > 0) {
    return rep.code(StatusCodes.CONFLICT).send({
      code: StatusCodes.CONFLICT,
      status: StatusDescriptions.CONFLICT,
      message: ResponseMessages.USER_EXISTS_WITH_USERNAME_409,
    });
  }
}

export async function findUserByEmail(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { email } = req.body as UserRegistrationRequestBody;

  const response = await this.database.query<User>(
    `SELECT id FROM users u WHERE u.email LIKE $1;`,
    [`${email.trim()}`],
  );

  if (response.rowCount && response.rowCount > 0) {
    return rep.code(StatusCodes.CONFLICT).send({
      code: StatusCodes.CONFLICT,
      status: StatusDescriptions.CONFLICT,
      message: ResponseMessages.USER_EXISTS_WITH_EMAIL_409,
    });
  }
}

export async function findUserByPhoneNumber(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { mobile } = req.body as UserRegistrationRequestBody;

  const response = await this.database.query<User>(
    `SELECT id FROM users u WHERE u.mobile LIKE $1;`,
    [`${mobile.trim()}`],
  );

  if (response.rowCount && response.rowCount > 0) {
    return rep.code(StatusCodes.CONFLICT).send({
      code: StatusCodes.CONFLICT,
      status: StatusDescriptions.CONFLICT,
      message: ResponseMessages.USER_EXISTS_WITH_PHONE_NUMBER_409,
    });
  }
}

export async function checkIfUserIsActive(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { user_id } = req.headers as UserHeaders;

    if (!user_id) {
      throw Error("User id is missing!");
    }

    const user = (
      await this.database.query<User>(
        `
      SELECT u.is_active
      FROM users u
      WHERE u.id = $1
    `,
        [user_id.trim()],
      )
    ).rows[0];

    if (!user) {
      throw Error("User is missing!");
    }

    if (!user.is_active) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: ResponseMessages.INACTIVE_USER_400,
      });
    }
  } catch (error) {
    console.error(error);
    return rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: ResponseMessages.UNEXPECTED_ERROR_500,
    });
  }
}
