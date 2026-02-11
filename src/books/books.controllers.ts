import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
  PaginationDetails,
  PaginationParams,
} from "../utils/pagination/pagination.types.js";
import PaginationService from "../utils/pagination/pagination.service.js";

import { Book, GetBookParams } from "./books.types.js";
import { StatusCodes } from "../enums/status-codes.js";
import { StatusDescriptions } from "../enums/status-descriptions.js";
import { ResponseMessages } from "../enums/response-messages.js";

export async function addBooks(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const books: Book[] = req.body as Book[];

    // Create parameter positions
    const parameterPositions = books
      .map(
        (book, index) =>
          `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`,
      )
      .join(", ");

    // Create parameterized query
    const query = `
        INSERT INTO books (id, title, author, isbn, published_at, is_available, quantity)
        VALUES ${parameterPositions};
    `;

    // Format values
    const values = books.flatMap((book) => [
      uuidv4(),
      book.title,
      book.author,
      book.isbn,
      book.publishedAt,
      book.quantity > 0 ? true : false,
      book.quantity,
    ]);

    await this.database.query(query, values);

    const response = {
      code: StatusCodes.CREATED,
      status: StatusDescriptions.CREATED,
      message: ResponseMessages.BOOK_CREATED_201,
    };

    rep.code(StatusCodes.CREATED).send(response);
  } catch (error) {
    console.log(error);
    rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: ResponseMessages.BOOK_COULD_NOT_BE_STORED_500,
    });
  }
}

export async function getBooks(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { page, limit } = req.query as PaginationParams;

    const paginationService = PaginationService.initialize(
      Number.parseInt(page.toString()),
      Number.parseInt(limit.toString()),
    );

    let query = `SELECT COUNT(b.id) AS count
                 FROM books b`;

    let result = (await this.database.query(query)).rows[0];

    let paginationDetails: PaginationDetails | undefined;
    try {
      paginationDetails = paginationService.paginate(result["count"] as never);
    } catch (error) {
      console.log(error);
      return rep.code(400).send(error);
    }

    query = `
        SELECT b.id,
               b.title,
               b.author,
               b.isbn,
               b.published_at,
               b.is_available,
               b.quantity
        FROM books b
        OFFSET $1 LIMIT $2;
    `;

    result = await this.database.query(query, [
      paginationDetails.offset,
      paginationService.getLimit(),
    ]);

    const response = {
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      data: [...result.rows],
      pagination: {
        totalRecords: result.rowCount,
        currentPage: paginationService.getCurrentPage(),
        limit: paginationService.getLimit(),
        totalPages: paginationDetails.totalPages,
        nextPage: paginationDetails.nextPage,
        prevPage: paginationDetails.previousPage,
      },
      message: ResponseMessages.BOOK_HAS_BEEN_RETRIEVED_200,
    };
    rep.code(StatusCodes.OK).send(response);
  } catch (error) {
    console.error(error);
    rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: ResponseMessages.BOOK_COULD_NOT_BE_RETRIEVED_500,
    });
  }
}

export async function getBook(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { id } = req.params as GetBookParams;

  if (!id || id === "") {
    return rep.code(StatusCodes.BAD_REQUEST).send({
      code: StatusCodes.BAD_REQUEST,
      status: StatusDescriptions.BAD_REQUEST,
      message: ResponseMessages.INVALID_BOOK_ID_400,
    });
  }

  try {
    const result = await this.database.query(
      `
          SELECT b.id, b.title, b.author, b.isbn, b.published_at, b.is_available, b.quantity
          FROM books b
          WHERE id = $1;
      `,
      [id],
    );

    rep.code(StatusCodes.OK).send({
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      message: ResponseMessages.BOOK_HAS_BEEN_RETRIEVED_200,
      data: { ...result.rows[0] },
    });
  } catch (error) {
    console.log(error);
    return rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: ResponseMessages.UNEXPECTED_ERROR_500,
    });
  }
}

export async function removeBooks(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { ids } = req.query as { ids: string };
    const separators: string[] = [",", "?", ":", ":", ";"];

    const separator = separators.find((separator) => ids.includes(separator));

    if (!separator) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusCodes.BAD_REQUEST,
        message: ResponseMessages.INVALID_SEPARATOR_400,
      });
    }

    const bookIds: string[] = ids
      .split(separator)
      .map((id) => id.trim())
      .filter((id) => id !== "");

    const queryParams = bookIds.map(
      (bookId: string, index: number) => `$${index + 1}`,
    );

    if (queryParams.length === 0) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: ResponseMessages.MISSING_QUERY_PARAMS_400,
      });
    }

    const rowsAffected: number =
      (
        await this.database.query(
          `
      DELETE FROM books WHERE id IN (${queryParams});
    `,
          [...bookIds],
        )
      ).rowCount ?? 0;

    rep.code(StatusCodes.OK).send({
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      message: ResponseMessages.BOOK_REMOVED_200,
      data: { rowsAffected },
    });
  } catch (error) {
    console.error(error);
    return rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: ResponseMessages.UNEXPECTED_ERROR_500,
    });
  }
}
