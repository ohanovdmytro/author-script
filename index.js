const { Client } = require("pg");
require("dotenv").config();

const USER_NAME = process.env.USER_NAME;
const PASSWORD = process.env.PASSWORD;
const HOST = process.env.HOST;
const DATABASE_NAME = process.env.DATABASE_NAME;

const postgresConnectionString = `postgres://${USER_NAME}:${PASSWORD}@${HOST}:5432/${DATABASE_NAME}`;

const client = new Client({
  connectionString: postgresConnectionString,
});

const getPathFromDb = async () => {
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
    console.error(error);
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
        const authorStruct = {
          id: row.id,
          login: row.login,
          path: `https://telegra.ph/${row.telegraph_path}`,
          grade: grade.includes("⭐️⭐️⭐️⭐️⭐️") ? 5 : 4,
        };

        uploadData.push(authorStruct);
      }
    } catch (error) {
      console.error(error);
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
    throw new Error("Error fetching data: " + error.message);
  }
};

const uploadDataToSheet = async () => {
  try {
    const sheetData = await getGradeFromTelegraph();
    const jsonSheetData = JSON.stringify(sheetData);
    
    //TODO: send sheetData to GoogleSheets

    console.log(sheetData);
  } catch (error) {
    console.error(error);
  }
};

uploadDataToSheet();
