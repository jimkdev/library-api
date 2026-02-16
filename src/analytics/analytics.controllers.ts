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
         WITH available_books AS (
           SELECT b.id
           FROM books b
           WHERE b.is_available
         ),
         active_users AS (
           SELECT u.id
           FROM users u
           WHERE u.is_active
          )
          SELECT
            COUNT(bl.id):: BIGINT AS total_book_lendings,
            COUNT(DISTINCT au.id):: BIGINT AS total_active_users,
            COUNT(DISTINCT ab.id):: BIGINT AS total_available_books
          FROM book_lendings bl
          RIGHT JOIN available_books ab
            ON bl.book_id = ab.id
          FULL OUTER JOIN active_users au
            ON bl.user_id = au.id;
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
