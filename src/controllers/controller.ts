import UserController from "./users.js";

export default class Controller {
  public static getUserController(): UserController {
    return UserController.getInstance();
  }
}
