import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Controller from "../controllers/controller.js";
import UserController from "../controllers/users.js";

export default fp(function (
  app: FastifyInstance,
  opts,
  done: (err?: Error) => void,
) {
  const baseUrl = "/users";

  const controller: UserController = Controller.getUserController();

  app.route({
    method: "POST",
    url: `${baseUrl}/login`,
    handler: controller.login,
  });

  app.route({
    method: "POST",
    url: `${baseUrl}/register`,
    handler: controller.register,
  });

  done();
});
