export type UserRegistrationRequestBody = {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
};

export type User = {
  id: string;
};
