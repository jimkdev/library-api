export type UserRegistrationRequestBody = {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
};

export type UserLoginRequestBody = {
  username: string;
  password: string;
};

export type UserLogoutRequestBody = {
  refreshToken: string;
};

export type User = {
  id: string;
  username: string;
  password?: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
};
