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

export default fp(function (app: FastifyInstance, opts, done: () => void) {
  const baseUrl = "/books";

  app.route({
    url: `${baseUrl}/add`,
    method: "POST",
    preHandler: [isAuthorized],
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
              message: "Book could not be stored!",
            }),
          );
      }
    },
  });

  done();
});
