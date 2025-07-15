import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

import { PaginationParams } from "../utils/pagination/pagination.types.js";

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

    rep.type("application/json").code(201).send(JSON.stringify(response));
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
    let { page, limit } = req.query as PaginationParams;

    // TODO Separate pagination logic

    page = Number.parseInt(page.toString());
    limit = Number.parseInt(limit.toString());

    const offset = limit * (page - 1);

    let query = `SELECT COUNT(b.id) AS count
                 FROM books b`;

    let result = (await this.database.query(query)).rows[0];

    const totalPages = limit > 0 ? Math.ceil(result["count"] / limit) : 1;

    if (page > totalPages) {
      return rep
        .code(400)
        .type("application/json")
        .send(
          JSON.stringify({
            code: 400,
            status: "Bad request",
            message:
              "Current page number cannot be greater than total pages number!",
          }),
        );
    }

    const nextPage = page >= totalPages ? null : page + 1;
    const prevPage = page <= 1 ? null : page - 1;

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

    result = await this.database.query(query, [offset, limit]);

    const response = {
      code: 200,
      status: "OK",
      data: [...result.rows],
      pagination: {
        totalRecords: result.rowCount,
        currentPage: page,
        limit: limit,
        totalPages: totalPages,
        nextPage: nextPage,
        prevPage: prevPage,
      },
      message: "Books have been retrieved!",
    };
    rep.code(200).type("application/json").send(JSON.stringify(response));
  } catch (error) {
    console.error(error);
    rep
      .code(500)
      .type("application/json")
      .send(
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
    return rep
      .code(400)
      .type("application/json")
      .send(
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
    return rep.code(500).type("application/json").send({
      code: 500,
      status: "Internal Server Error",
      message: "An unexpected error occured!",
    });
  }
}
