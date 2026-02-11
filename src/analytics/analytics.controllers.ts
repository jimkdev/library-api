import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { Analytics } from "./analytics.types.js";
import { StatusCodes } from "../enums/status-codes.js";
import { StatusDescriptions } from "../enums/status-descriptions.js";
import { ResponseMessages } from "../enums/response-messages.js";

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

    rep.code(StatusCodes.OK).send({
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      message: ResponseMessages.ANALYTICS_HAVE_BEEN_RETRIEVED_200,
      data: {
        totalBookLendings: analytics["total_book_lendings"],
        totalActiveUsers: analytics["total_active_users"],
        totalAvailableBooks: analytics["total_available_books"],
      },
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
