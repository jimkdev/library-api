export type Book = {
  id?: string | number;
  title: string;
  author: string;
  isbn: string;
  published_at: Date;
  quantity: number;
  is_available: boolean;
};

export type AddBookDto = {
  title: string;
  author: string;
  isbn: string;
  publishedAt: Date;
  quantity: number;
};

export type GetBookParams = {
  id: string;
};
