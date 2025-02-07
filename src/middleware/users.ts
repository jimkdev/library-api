import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { User, UserRegistrationRequestBody } from "../types/users.js";

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
    return rep
      .code(409)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 409,
          status: "Conflict",
          message: "A user already exists with the same username!",
        }),
      );
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
    return rep
      .code(409)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 409,
          status: "Conflict",
          message: "A user already exists with the same email!",
        }),
      );
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
    return rep
      .code(409)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 409,
          status: "Conflict",
          message: "A user already exists with the same phone number!",
        }),
      );
  }
}
