import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { QueryResult } from "pg";

import AppConfig from "../config.js";

import {
  BookLendingDto,
  ExtendBookLendingReturnDateDto,
} from "./book-lendings.types.js";
import { StatusCodes } from "../enums/status-codes.js";
import { StatusDescriptions } from "../enums/status-descriptions.js";

export async function lendBook(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { userId, bookId } = req.body as BookLendingDto;

    const config = AppConfig.getInstance();

    if (!userId) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: "Invalid user id!",
      });
    }

    const user = (
      (await this.database.query(
        `
      SELECT u.id from users u WHERE u.id = $1
    `,
        [userId],
      )) as QueryResult<{ id: string }>
    ).rows[0];

    if (!user) {
      return rep.code(StatusCodes.NOT_FOUND).send({
        code: StatusCodes.NOT_FOUND,
        status: StatusDescriptions.NOT_FOUND,
        message: "User does not exist!",
      });
    }

    if (!bookId) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: "Invalid book id!",
      });
    }

    const bookData = (
      await this.database.query(
        `
        SELECT is_available, quantity
        FROM books
        WHERE id = $1;
      `,
        [bookId],
      )
    ).rows[0];

    if (bookData.is_available) {
      const active_book_lending_id = (
        await this.database.query(
          `
        SELECT id FROM book_lendings
        WHERE user_id = $1 AND returned_at IS NULL;
      `,
          [userId],
        )
      ).rows[0];

      if (active_book_lending_id) {
        return rep.code(StatusCodes.BAD_REQUEST).send({
          code: StatusCodes.BAD_REQUEST,
          status: StatusDescriptions.BAD_REQUEST,
          message:
            "This user has already been given a book which is not yet returned!",
        });
      }

      try {
        await this.database.query("BEGIN;");
        await this.database.query(
          `
          INSERT INTO book_lendings (user_id, book_id, date_of_return) VALUES ($1, $2, $3);
        `,
          [
            userId,
            bookId,
            DateTime.now()
              .toUTC()
              .plus({ day: config.getNumberOfDaysBeforeReturn() }),
          ],
        );

        const updatedQuantity =
          bookData.quantity <= 0 ? 0 : bookData.quantity - 1;
        await this.database.query(
          `
          UPDATE books
          SET quantity = $1
          WHERE id = $2
        `,
          [updatedQuantity, bookId],
        );

        if (updatedQuantity <= 0) {
          await this.database.query(
            `
            UPDATE books
            SET is_available = $1
            WHERE id = $2
          `,
            [updatedQuantity > 0, bookId],
          );
        }
        await this.database.query("COMMIT;");
      } catch (error) {
        console.log(error);
        await this.database.query("ROLLBACK;");
      }
    } else {
      rep.code(StatusCodes.OK).send({
        code: StatusCodes.OK,
        status: StatusDescriptions.OK,
        message: "Book is not available!",
      });
    }
  } catch (error) {
    console.log(error);
    return rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: "An unexpected error has occurred!",
    });
  }
}

export async function extendReturnDate(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { bookLendingId, extensionDays } =
    req.body as ExtendBookLendingReturnDateDto;

  const validExtensionDays: number[] = [3, 5, 7];

  try {
    await this.database.query("BEGIN;");
    const response = (await this.database.query(
      `SELECT bl.date_of_return, date_extended FROM book_lendings bl
        WHERE bl.id = ${bookLendingId};`,
    )) as QueryResult<{ date_of_return: number; date_extended: boolean }>;

    const data = response.rows[0];

    if (!data) {
      return rep.code(StatusCodes.NOT_FOUND).send({
        code: StatusCodes.NOT_FOUND,
        status: StatusDescriptions.NOT_FOUND,
        message: "Book not found!",
      });
    }

    if (data.date_extended) {
      return rep.code(StatusCodes.OK).send({
        code: StatusCodes.OK,
        status: StatusDescriptions.OK,
        message: "You have already extended the return period!",
      });
    }

    if (
      !validExtensionDays.find(
        (validExtensionDay) => validExtensionDay === extensionDays,
      )
    ) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: "Extension days number is not in available extension days!",
      });
    }

    const newDate = DateTime.fromJSDate(new Date(data.date_of_return)).plus({
      day: extensionDays,
    });

    await this.database.query(
      `
        UPDATE book_lendings
        SET date_of_return = '${newDate.toISODate()}', date_extended = TRUE
        WHERE id = ${bookLendingId}`,
    );
    await this.database.query("COMMIT;");
  } catch (error) {
    console.log(error);
    await this.database.query("ROLLBACK;");

    rep.code(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      status: StatusDescriptions.INTERNAL_SERVER_ERROR,
      message: "An unexpected error has occurred!",
    });
  }
}

export async function returnBook(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { userId, bookId } = req.body as BookLendingDto;

    if (!userId) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: "Invalid user id!",
      });
    }

    const user = (
      (await this.database.query(
        `
        SELECT u.id from users u WHERE u.id = $1
      `,
        [userId],
      )) as QueryResult<{ id: string }>
    ).rows[0];

    if (!user) {
      return rep.code(StatusCodes.NOT_FOUND).send({
        code: StatusCodes.NOT_FOUND,
        status: StatusDescriptions.NOT_FOUND,
        message: "User does not exist!",
      });
    }

    if (!bookId) {
      return rep.code(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        status: StatusDescriptions.BAD_REQUEST,
        message: "Invalid book id!",
      });
    }

    const bookData = (
      await this.database.query(
        `
          SELECT quantity
          FROM books
          WHERE id = $1;
        `,
        [bookId],
      )
    ).rows[0];

    await this.database.query("BEGIN;");
    let affectedRows = (
      await this.database.query(
        `
      UPDATE book_lendings
      SET returned_at = $1
      WHERE user_id = $2 AND book_id = $3 AND returned_at IS NULL;
    `,
        [DateTime.now().toUTC(), userId, bookId],
      )
    ).rowCount;

    if (affectedRows === 0) {
      throw new Error("Book lending could not be updated!");
    }

    affectedRows = (
      await this.database.query(
        `
      UPDATE books
      SET quantity = $1, is_available = $2
      WHERE id = $3;
    `,
        [bookData.quantity + 1, true, bookId],
      )
    ).rowCount;

    if (affectedRows === 0) {
      throw new Error("Book could not be updated!");
    }

    await this.database.query("COMMIT;");

    rep.code(StatusCodes.OK).send({
      code: StatusCodes.OK,
      status: StatusDescriptions.OK,
      message: "Book has been returned!",
    });
  } catch (error) {
    console.error(error);
    await this.database.query("ROLLBACK;");
  }
}
