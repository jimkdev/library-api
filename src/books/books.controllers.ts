import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
  PaginationDetails,
  PaginationParams,
} from "../utils/pagination/pagination.types.js";
import PaginationService from "../utils/pagination/pagination.service.js";

import { Book, GetBookParams } from "./books.types.js";

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
      code: 201,
      status: "Created",
      message: "Book(s) have been created!",
    };

    rep.code(201).type("application/json").send(JSON.stringify(response));
  } catch (error) {
    console.log(error);
    rep
      .code(500)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 500,
          status: "Internal server error",
          message: "Book(s) could not be stored!",
        }),
      );
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
      console.log(JSON.parse(error as string));
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
      code: 200,
      status: "OK",
      data: [...result.rows],
      pagination: {
        totalRecords: result.rowCount,
        currentPage: paginationService.getCurrentPage(),
        limit: paginationService.getLimit(),
        totalPages: paginationDetails.totalPages,
        nextPage: paginationDetails.nextPage,
        prevPage: paginationDetails.previousPage,
      },
      message: "Books have been retrieved!",
    };
    rep.code(200).type("application/json").send(JSON.stringify(response));
  } catch (error) {
    console.error(error);
    rep.code(500).send(
      JSON.stringify({
        code: 500,
        status: "Internal server error",
        message: "Could not fetch books!",
      }),
    );
  }
}

export async function getBook(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { id } = req.params as GetBookParams;

  if (!id || id === "") {
    return rep.code(400).send(
      JSON.stringify({
        code: 400,
        status: "Bad request!",
        message: "Invalid id!",
      }),
    );
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

    rep
      .code(200)
      .type("application/json")
      .send(
        JSON.stringify({
          code: 200,
          status: "OK",
          data: { ...result.rows[0] },
        }),
      );
  } catch (error) {
    console.log(error);
    return rep.code(500).send({
      code: 500,
      status: "Internal Server Error",
      message: "An unexpected error occured!",
    });
  }
}
