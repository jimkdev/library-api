import { FastifyReply, FastifyRequest } from "fastify";

export default class UserController {
  private static instance: UserController;

  private constructor() {}

  public static getInstance(): UserController {
    if (!this.instance) {
      this.instance = new UserController();
    }

    return this.instance;
  }

  public async login(req: FastifyRequest, rep: FastifyReply): Promise<void> {}

  public async register(
    req: FastifyRequest,
    rep: FastifyReply,
  ): Promise<void> {}
}
