import { StringValue } from "ms";

type DatabaseSettings = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

/* Configuration file */
export default class AppConfig {
  private static instance: AppConfig;

  private readonly host: string;
  private readonly port: number;
  private readonly isProductionEnvironment: boolean;
  private readonly dbSettings: DatabaseSettings;
  private readonly jwtExpirationTime: StringValue;
  private readonly jwtAccessTokenSecret: string;
  private readonly jwtRefreshTokenSecret: string;

  private constructor() {
    this.host = process.env.HOST!;
    this.port = Number.parseInt(process.env.PORT!);
    this.isProductionEnvironment = process.env.NODE_ENV === "production";
    this.dbSettings = JSON.parse(process.env.DB ?? "{}");
    this.jwtExpirationTime = "1H";
    this.jwtAccessTokenSecret = process.env.ACCESS_TOKEN_SECRET!;
    this.jwtRefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new AppConfig();
    }

    return this.instance;
  }

  public getHost() {
    return this.host;
  }

  public getPort() {
    return this.port;
  }

  public isProductionEnvironment(): boolean {
    return this.isProductionEnvironment;
  }

  public getDatabaseSettings() {
    return this.dbSettings;
  }

  public getJwtExpirationTime(): StringValue {
    return this.jwtExpirationTime;
  }

  public getJwtAccessTokenSecret(): string {
    return this.jwtAccessTokenSecret;
  }

  public getJwtRefreshTokenSecret(): string {
    return this.jwtRefreshTokenSecret;
  }
}
