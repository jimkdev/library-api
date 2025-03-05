import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

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
    handler: async function (req: FastifyRequest, rep: FastifyReply) {
      // TODO find a better implementation solution
      // Finish implementation

      try {
        const books: Book[] = req.body as Book[];

        const values = books
          .map(
            (book, index) =>
              `('${uuidv4()}', '${book.title}', '${book.author}', '${book.isbn}', '${book.publishedAt}', ${book.quantity > 0 ? true : false}, ${book.quantity})${index === books.length - 1 ? "" : ","}`,
          )
          .reduce((a, b) => a + b);

        const query = `
          INSERT INTO books (id, title, author, isbn, published_at, is_available, quantity)
          VALUES ${values};
        `;
        await this.database.query(query);
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
