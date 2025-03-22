import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import AppConfig from "../config.js";

export function isAuthorized(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
  next: () => void,
) {
  const authHeader = req.headers.authorization;
  const config = AppConfig.getInstance();

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return rep
      .code(401)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 401,
          status: "Unauthorized",
          message: "Unauthorized",
        }),
      );
  }

  try {
    jwt.verify(token, config.getJwtAccessTokenSecret());
  } catch (error) {
    rep
      .code(401)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 401,
          status: "Unauthorized",
          message: "Unauthorized",
        }),
      );
  }

  next();
}
