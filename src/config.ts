/* Configuration file */
export default class AppConfig {
  private static instance: AppConfig;

  private readonly host: string;
  private readonly port: number;

  private constructor() {
    this.host = process.env.HOST!;
    this.port = Number.parseInt(process.env.PORT!);
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
}
