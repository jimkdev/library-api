import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

import { isAuthorized } from "../../middleware/auth.js";

type Book = {
  id?: string;
  title: string;
  author: string;
  isbn: string;
  publishedAt: Date;
  quantity: number;
};

type PaginationParams = {
  page: string | number;
  limit: string | number;
};

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  const baseUrl = "/books";

  app.route({
    url: `${baseUrl}/add`,
    method: "POST",
    preHandler: [isAuthorized],
    schema: {
      body: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "author", "isbn", "publishedAt", "quantity"],
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            isbn: { type: "string" },
            publishedAt: { type: "string" },
            quantity: { type: "number" },
          },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
        400: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            code: { type: "string" },
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
        500: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: async function (req: FastifyRequest, rep: FastifyReply) {
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
    },
  });

  app.route({
    url: `${baseUrl}`,
    method: "GET",
    preHandler: [isAuthorized],
    schema: {
      querystring: {
        type: "object",
        required: ["page", "limit"],
        properties: {
          page: { type: "number" },
          limit: { type: "string" },
        },
      },
      response: {
        400: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            code: { type: "string" },
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        200: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  title: { type: "string" },
                  author: { type: "string" },
                  isbn: { type: "string" },
                  published_at: { type: "string" },
                  is_available: { type: "boolean" },
                  quantity: { type: "number" },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                totalRecords: { type: "number" },
                currentPage: { type: "number" },
                limit: { type: "number" },
                totalPages: { type: "number" },
                nextPage: { type: "number" },
                prevPage: { type: "number" },
              },
            },
            message: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
        500: {
          type: "object",
          properties: {
            code: { type: "number" },
            status: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: async function (req: FastifyRequest, rep: FastifyReply) {
      try {
        let { page, limit } = req.query as PaginationParams;

        // TODO Separate pagination logic

        page = Number.parseInt(page.toString());
        limit = Number.parseInt(limit.toString());

        const offset = limit * (page - 1);

        let query = `SELECT COUNT(b.id) AS count FROM books b`;

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
          SELECT b.id, b.title, b.author, b.isbn, b.published_at,
          b.is_available, b.quantity FROM books b
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
    },
  });

  done();
});
