export type BookLendingDto = {
  userId: string;
  bookId: string;
};

export type ExtendBookLendingReturnDateDto = {
  bookLendingId: number;
  extensionDays: number;
};
