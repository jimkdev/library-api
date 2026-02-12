import { UserRoles } from "../enums/users.js";

export type UserRegistrationRequestBody = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
};

export type UserLoginRequestBody = {
  username: string;
  password: string;
};

export type User = {
  id: string;
  username: string;
  password?: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  role: UserRoles;
  is_active: boolean;
};
