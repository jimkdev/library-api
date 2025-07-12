import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  app.decorate("user", null);
  done();
});
