export type Book = {
  id?: string;
  title: string;
  author: string;
  isbn: string;
  publishedAt: Date;
  quantity: number;
};

export type GetBookParams = {
  id: string;
};
