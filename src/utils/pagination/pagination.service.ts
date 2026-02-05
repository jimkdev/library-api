import { PaginationDetails } from "./pagination.types.js";

export default class PaginationService {
  private static readonly defaultLimit: number = 10;

  private readonly page: number;
  private readonly limit: number;

  private constructor(page: number, limit: number) {
    this.page = page;
    this.limit = limit;
  }

  public static initialize(page: number, limit: number): PaginationService {
    const pageNumber: number = page <= 0 ? 1 : page;
    const limitNumber: number =
      limit <= 0 ? PaginationService.defaultLimit : limit;

    return new PaginationService(pageNumber, limitNumber);
  }

  public getLimit(): number {
    return this.limit;
  }

  public getCurrentPage() {
    return this.page;
  }

  public paginate(totalItems: never): PaginationDetails {
    const offset: number = this.limit * (this.page - 1);

    const totalPages: number = Math.ceil(totalItems / this.limit);

    if (this.page > totalPages) {
      throw new Error(
        JSON.stringify({
          code: 400,
          status: "Bad request",
          message:
            "Current page number cannot be greater than total pages number!",
        }),
      );
    }

    const nextPage: number | null =
      this.page >= totalPages ? null : this.page + 1;
    const previousPage: number | null = this.page <= 1 ? null : this.page - 1;

    return { offset, totalPages, nextPage, previousPage };
  }
}
