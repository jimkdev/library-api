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
      SELECT
        CAST(COUNT(bl.id) AS BIGINT) AS total_book_lendings,
        CAST(COUNT(DISTINCT u.id) AS BIGINT) AS total_active_users,
        CAST(COUNT(DISTINCT b.id) AS BIGINT) AS total_available_books
      FROM book_lendings bl
      RIGHT JOIN(
          SELECT b1.id
          FROM books b1
          WHERE b1.is_available
      ) b
      ON b.id = bl.book_id
      FULL OUTER JOIN (
          SELECT u1.id FROM users u1
          WHERE u1.is_active
      ) u
      ON bl.user_id = u.id;
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
