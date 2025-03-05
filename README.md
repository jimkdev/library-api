# Library API

## Table of contents
- [About the project](#about-the-project)
- [Installation and usage](#installation-and-usage)
  - [Requirements](#requirements)
  - [How to initialize the database](#how-to-initialize-the-database)
  - [Configuration](#configuration)
  - [How to run the project in development mode](#how-to-run-the-project-in-development-mode)
  - [How to build and run the project in production mode](#how-to-build-and-run-the-project-in-production-mode)

## About the project
This API is made as a personal project in order to better understand **Fastify**, **NodeJS**, **Typescript** and **PostgreSQL**. With this API, the client will be able to manage books, rentals and the users of the library. For the authentication, it uses **JSON web tokens**. For the validation of the input **JSON-Schema** is being used. While it tries to be a simple project, the goal is to make it as secure as possible, use design patterns wherever possible and trying to follow best practices.

## Installation and usage

### Requirements
1. ```NodeJS >= 22.11.0```
2. ```PostgreSQL``` for the database

### How to initialize the database
First, you need to initialize the database. For that, you need the **init-db.sql** file located inside the **database** directory. You can run this file in Dbeaver or in an another program of your liking. Once the database is initialized, please follow the below instructions on how to run the project.

### Configuration

Before you are able to run the project, a **.env** file should be created inside the root directory, containing the following options:
```
# App settings
HOST=
PORT=

# JWT settings
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=

# Database settings
DB={"host":"","port":5432,"database":"","user":"","password":""}
```

### How to run the project in development mode
Please run the following commands in your terminal:
1. ```npm install```
2. ```npm run dev```

### How to build and run the project in production mode
Please run the following commands in your terminal:
1. ```npm install``` if haven't already run it
2. ```npm run build``` in order to compile the typescript code and generate the required **.js** files
3. ```npm start```

The generated files after you run ```npm run build``` are located inside the **dist/** directory.