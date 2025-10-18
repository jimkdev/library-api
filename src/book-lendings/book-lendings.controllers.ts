import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";

import {
  CreateBookLendingDto,
  ExtendBookLendingReturnDateDto,
} from "./book-lendings.types.js";
import { QueryResult } from "pg";
import AppConfig from "../config.js";

export async function lendBook(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  try {
    const { bookId } = req.body as CreateBookLendingDto;

    const config = AppConfig.getInstance();

    if (!bookId) {
      return rep.code(200).send(
        JSON.stringify({
          code: 400,
          status: "Bad request",
          message: "Invalid book id!",
        }),
      );
    }

    try {
      await this.database.query("BEGIN;");
      await this.database.query(
        `
      INSERT INTO book_lendings (user_id, book_id, date_of_return) VALUES ($1, $2, $3);
    `,
        [
          this.user,
          bookId,
          DateTime.now()
            .toUTC()
            .plus({ day: config.getNumberOfDaysBeforeReturn() }),
        ],
      );
      await this.database.query("COMMIT;");
    } catch (error) {
      console.log(error);
      await this.database.query("ROLLBACK;");
    }
  } catch (error) {
    console.log(error);
    return rep.code(500).send(
      JSON.stringify({
        code: 500,
        status: "Internal server error",
        message: "An unexpected error has occured!",
      }),
    );
  }
}

export async function extendReturnDate(
  this: FastifyInstance,
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { bookLendingId, extensionDays } =
    req.body as ExtendBookLendingReturnDateDto;
  // const numOfDays = Number.parseInt(extensionDays);
  // const id = Number.parseInt(bookLendingId);

  // if (Number.isNaN(numOfDays)) {
  //   return rep
  //     .code(400)
  //     .type("application/json")
  //     .send(
  //       JSON.stringify({
  //         code: 400,
  //         status: "Bad request",
  //         message: "The number of days is invalid!",
  //       }),
  //     );
  // }
  //
  // if (Number.isNaN(id)) {
  //   return rep
  //     .code(400)
  //     .type("application/json")
  //     .send(
  //       JSON.stringify({
  //         code: 400,
  //         status: "Bad request",
  //         message: "The book lending id is invalid!",
  //       }),
  //     );
  // }

  const validExtensionDays: number[] = [3, 5, 7];

  try {
    await this.database.query("BEGIN;");
    const response = (await this.database.query(
      `SELECT bl.date_of_return, date_extended FROM book_lendings bl
        WHERE bl.id = ${bookLendingId};`,
    )) as QueryResult<{ date_of_return: number; date_extended: boolean }>;

    const data = response.rows[0];

    if (!data) {
      return rep.code(404).send(
        JSON.stringify({
          code: 404,
          status: "Not found",
          message: "Book not found!",
        }),
      );
    }

    if (data.date_extended) {
      return rep.code(200).send(
        JSON.stringify({
          code: 200,
          status: "OK",
          message: "You have already extended the return period!",
        }),
      );
    }

    if (
      !validExtensionDays.find(
        (validExtensionDay) => validExtensionDay === extensionDays,
      )
    ) {
      return rep.code(400).send(
        JSON.stringify({
          code: 400,
          status: "Bad request",
          message: "Extension days number is not in available extension days!",
        }),
      );
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

    rep.code(500).send(
      JSON.stringify({
        code: 500,
        status: "Internal server error",
        message: "An unexpected error has occured!",
      }),
    );
  }
}
