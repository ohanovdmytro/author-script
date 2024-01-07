const { google } = require("googleapis");
const { Client } = require("pg");
require("dotenv").config();

const USER_NAME = process.env.USER_NAME;
const PASSWORD = process.env.PASSWORD;
const HOST = process.env.HOST;
const DATABASE_NAME = process.env.DATABASE_NAME;

const getPathFromDb = async () => {
  const postgresConnectionString = `postgres://${USER_NAME}:${PASSWORD}@${HOST}:5432/${DATABASE_NAME}`;

  const client = new Client({
    connectionString: postgresConnectionString,
  });

  try {
    await client.connect();

    const query = `SELECT telegraph_path, id, login
      FROM bot_clients
      WHERE telegraph_path IS NOT NULL;`;

    const res = await client.query(query);

    const resultArray = res.rows.map((row) => {
      return {
        telegraph_path: row.telegraph_path,
        id: row.id,
        login: row.login,
      };
    });
    return resultArray;
  } catch (error) {
    console.error(error.message);
  } finally {
    await client.end();
  }
};

const getGradeFromTelegraph = async () => {
  const dataFromDb = await getPathFromDb();
  const uploadData = [];
  for (const row of dataFromDb) {
    try {
      const grade = await fetchGrade(row.telegraph_path);

      if (grade.includes("⭐️⭐️⭐️⭐️")) {
        const authorStruct = [
          row.id,
          `https://t.me/${row.login}`,
          `https://telegra.ph/${row.telegraph_path}`,
          grade.includes("⭐️⭐️⭐️⭐️⭐️") ? 5 : 4,
        ];

        uploadData.push(authorStruct);
      }
    } catch (error) {
      console.error(error.message);
    }
  }
  return uploadData;
};

const fetchGrade = async (link) => {
  try {
    const response = await fetch(
      `https://api.telegra.ph/getPage/${link}?return_content=true`
    );

    const data = await response.json();
    if (data.ok) {
      return data.result.content[3] || "";
    } else {
      throw new Error(data.error || "Unknown error");
    }
  } catch (error) {
    console.error(error.message);
  }
};

const uploadDataToSheet = async () => {
  try {
    const sheetData = await getGradeFromTelegraph();

    const spreadsheetId = "1iJ2vyKh9TX8fU8ggdqJmQw9Mf2ESXk1uOzI0wUGP1JI";
    const auth = new google.auth.GoogleAuth({
      keyFile: "credentials.json",
      scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: "v4", auth: client });

    await googleSheets.spreadsheets.values.append(
      {
        auth,
        spreadsheetId,
        range: "Помічники!A:B",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: sheetData,
        },
      },
      (err, res) => {
        if (err) return console.error(err.message);
      }
    );

    console.log("Data from DB was uploaded to Google Sheets");
  } catch (error) {
    console.error(error.message);
  }
};

uploadDataToSheet();
