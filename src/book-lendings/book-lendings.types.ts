export type CreateBookLendingDto = {
  bookId: string;
};

export type ExtendBookLendingReturnDateDto = {
  bookLendingId: number;
  extensionDays: number;
};
