import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import pg from "pg";
import AppConfig from "../config.js";

export default fp(function (
  app: FastifyInstance,
  opts,
  done: (err?: Error) => void,
) {
  const config = AppConfig.getInstance();

  app.decorate("database", new pg.Pool(config.getDatabaseSettings()));

  done();
});
