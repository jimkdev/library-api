export type PaginationParams = {
  page: string | number;
  limit: string | number;
};

export type PaginationDetails = {
  offset: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
};
