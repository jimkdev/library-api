import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { UserRegistrationRequestBody } from "../types/users.js";
import {
  findUserByEmail,
  findUserByPhoneNumber,
  findUserByUsername,
} from "../middleware/users.js";

export default fp(function (
  app: FastifyInstance,
  opts,
  done: (err?: Error) => void,
) {
  const baseUrl = "/users";

  app.route({
    method: "POST",
    url: `${baseUrl}/login`,
    handler: async function (req: FastifyRequest, res: FastifyReply) {},
  });

  app.route({
    method: "POST",
    url: `${baseUrl}/register`,
    preHandler: [findUserByUsername, findUserByEmail, findUserByPhoneNumber],
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
