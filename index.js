const { Client } = require("pg");

const axios = require("axios");
const cheerio = require("cheerio");
const { contents } = require("cheerio/lib/api/traversing");

require("dotenv").config();

const USER_NAME = process.env.USER_NAME;
const PASSWORD = process.env.PASSWORD;
const HOST = process.env.HOST;
const DATABASE_NAME = process.env.DATABASE_NAME;

const connectionString = `postgres://${USER_NAME}:${PASSWORD}@${HOST}:5432/${DATABASE_NAME}`;

const client = new Client({
  connectionString: connectionString,
});

const getDataFromDb = async () => {
  try {
    await client.connect();

    const query = `SELECT telegraph_path
    FROM bot_clients
    WHERE telegraph_path IS NOT NULL;`;

    const res = await client.query(query);

    return res.rows;
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
};

const getGradeFromTelegraph = async () => {
  const dataFromDb = await getDataFromDb();
  dataFromDb.forEach(async (row) => {
    try {
      const response = await axios.get(
        `https://telegra.ph/${row.telegraph_path}`
      );

      const $ = cheerio.load(response.data);

      const tagSelector = 'h4:contains("Оцінка: ")';

      const parentElement = $(tagSelector).parent();

      const content = parentElement.text().trim();

      console.log(content);
    } catch (error) {
      console.error(error);
    }
  });
};

const uploadDataToSheet = async () => {};

getGradeFromTelegraph();
