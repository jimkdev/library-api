-- ENUMS --
CREATE TYPE roles AS ENUM ('admin', 'user');

-- Tables --
CREATE TABLE IF NOT EXISTS users
(
    id         UUID PRIMARY KEY,
    username   VARCHAR(20) UNIQUE NOT NULL,
    password   VARCHAR(255)       NOT NULL,
    first_name VARCHAR(40)        NOT NULL,
    last_name  VARCHAR(40)        NOT NULL,
    email      VARCHAR(40) UNIQUE NOT NULL,
    mobile     VARCHAR(14) UNIQUE NOT NULL,
    role       roles              NOT NULL DEFAULT 'user',
    created_at TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books
(
    id           UUID PRIMARY KEY,
    title        VARCHAR(100) NOT NULL,
    author       VARCHAR(100) NOT NULL,
    ISBN         VARCHAR(17)  NOT NULL UNIQUE,
    published_at DATE,
    is_available BOOLEAN      NOT NULL DEFAULT FALSE,
    quantity     INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_lendings
(
    id             SERIAL PRIMARY KEY,
    user_id        UUID      NOT NULL REFERENCES users (id),
    book_id        UUID      NOT NULL REFERENCES books (id),
    lent_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returned_at    TIMESTAMP,
    date_of_return DATE      NOT NULL,
    date_extended  BOOLEAN            DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS refresh_tokens
(
    id         SERIAL PRIMARY KEY,
    user_id    UUID         NOT NULL,
    token      VARCHAR(255) NOT NULL,
    is_revoked BOOLEAN      NOT NULL DEFAULT FALSE,
    is_expired BOOLEAN      NOT NULL DEFAULT FALSE,
    expired_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);