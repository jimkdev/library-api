import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { Analytics } from "./analytics.types.js";

export async function getAnalytics(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const analytics: Analytics = (
      await this.database.query(`
    SELECT CAST((
      SELECT COUNT(bl.id) AS total_book_lendings
      FROM book_lendings bl
    ) AS INT),
     CAST((
       SELECT COUNT(u.id) AS total_active_users
       FROM users u
       WHERE u.is_active = TRUE
     ) AS INT),
     CAST((
       SELECT COUNT(b.id) AS total_available_books
       FROM books b
       WHERE b.quantity > 0
     ) AS INT);
  `)
    ).rows[0] as Analytics;

    rep.code(200).send({
      code: 200,
      status: "OK",
      data: {
        totalBookLendings: analytics["total_book_lendings"],
        totalActiveUsers: analytics["total_active_users"],
        totalAvailableBooks: analytics["total_available_books"],
      },
    });
  } catch (error) {
    console.log(error);
    return rep.code(500).send({
      code: 500,
      status: "Internal server error",
      message: "An unexpected error has occurred!",
    });
  }
}
