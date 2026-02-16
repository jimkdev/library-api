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
        WITH book_lendings_metrics AS (
          SELECT
            COUNT(bl.id)::BIGINT AS total_book_lendings,
            COUNT(bl.id) FILTER (WHERE bl.returned_at IS NOT NULL)::BIGINT AS total_closed_book_lendings,
            COUNT(bl.id) FILTER (WHERE bl.returned_at IS NULL)::BIGINT AS total_open_book_lendings
          FROM book_lendings bl
        ),
        user_metrics AS (
          SELECT
            COUNT(u.id) FILTER (WHERE u.is_active)::BIGINT AS total_active_users
          FROM users u
        ),
        book_metrics AS (
          SELECT
            COUNT(b.id) FILTER (WHERE b.is_available)::BIGINT AS total_available_books
          FROM books b
        )
        SELECT *
        FROM
          book_lendings_metrics,
          user_metrics,
          book_metrics;
      `)
    ).rows[0] as Analytics;

    rep.code(StatusCodes.OK).send({
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      message: ResponseMessages.ANALYTICS_HAVE_BEEN_RETRIEVED_200,
      data: {
        totalBookLendings: analytics["total_book_lendings"],
        totalClosedBookLendings: analytics["total_closed_book_lendings"],
        totalOpenBookLendings: analytics["total_open_book_lendings"],
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
