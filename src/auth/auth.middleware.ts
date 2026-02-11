import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";

import AppConfig from "../config.js";
import { StatusCodes } from "../enums/status-codes.js";
import { StatusDescriptions } from "../enums/status-descriptions.js";
import { ResponseMessages } from "../enums/response-messages.js";

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
    return rep.code(StatusCodes.UNAUTHORIZED).send({
      code: StatusCodes.UNAUTHORIZED,
      status: StatusDescriptions.UNAUTHORIZED,
      message: ResponseMessages.UNAUTHORIZED_401,
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
    return rep.code(StatusCodes.UNAUTHORIZED).send({
      code: StatusCodes.UNAUTHORIZED,
      status: StatusDescriptions.UNAUTHORIZED,
      message: ResponseMessages.UNAUTHORIZED_401,
    });
  }

  next();
}
