import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";

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
  const refreshToken = req.cookies["refresh_token"];

  if (!token || token === "" || !refreshToken || refreshToken === "") {
    return rep.code(401).send({
      code: 401,
      status: "Unauthorized",
      message: "Unauthorized",
    });
  }

  try {
    const data = jwt.verify(
      token,
      config.getJwtAccessTokenSecret(),
    ) as JwtPayload;
    this.user = data.userId;
  } catch (error) {
    console.log(error);
    return rep.code(401).send({
      code: 401,
      status: "Unauthorized",
      message: "Unauthorized",
    });
  }

  next();
}
