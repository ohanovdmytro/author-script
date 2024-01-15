const { google } = require("googleapis");
const { tasks } = require("googleapis/build/src/apis/tasks");
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
        id: row.id,
        telegraph_path: row.telegraph_path,
        login: row.login,
      };
    });
    // console.log(resultArray);
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
      const telegraphData = await fetchTelegraphData(row.telegraph_path);

      const content = telegraphData.result.content;
      const contentText = content
        .map((item) => (typeof item === "string" ? item : ""))
        .join(" ");

      const tasksRegex = /Виконано робіт: (\d+)|Выполнено работ: (\d+)/;
      const intimePercentageRegex = /Термін здачі: (\d+)%|Срок сдачи: (\d+)%/;
      const positiveFeedbackRegex =
        /Відгук: 👍 (\d+)%|Отзывы: 👍 (\d+)%|Відкликання: 👍 (\d+)/;
      const negativeFeedbackRegex =
        /Відгук: 👎 (\d+)%|Отзывы: 👎 (\d+)%|Відкликання: 👎 (\d+)/;

      const tasksCompleted = tasksRegex.exec(contentText);
      const positivePercentage = positiveFeedbackRegex.exec(contentText);
      const negativePercentage = negativeFeedbackRegex.exec(contentText);
      const intimePercentage = intimePercentageRegex.exec(contentText);

      const gradeMatch = content.find(
        (item) => typeof item === "string" && item.includes("⭐️")
      );
      const grade = gradeMatch ? gradeMatch.trim() : "";

      if (grade.includes("⭐️⭐️⭐️⭐️")) {
        const authorStruct = [
          row.id,
          `https://t.me/${row.login}`,
          `https://telegra.ph/${row.telegraph_path}`,
          grade.includes("⭐️⭐️⭐️⭐️⭐️") ? 5 : 4,
          tasksCompleted ? tasksCompleted[1] : null,
          positivePercentage ? positivePercentage[1] + "%" : null,
          negativePercentage ? negativePercentage[1] + "%" : null,
          intimePercentage ? intimePercentage[1] + "%" : null,
        ];

        uploadData.push(authorStruct);
      }
    } catch (error) {
      console.error(error.message);
    }
  }
  return uploadData;
};

const fetchTelegraphData = async (link) => {
  try {
    const response = await fetch(
      `https://api.telegra.ph/getPage/${link}?return_content=true`
    );

    const data = await response.json();
    if (data.ok) {
      // console.log(data.result.content);
      return data || "";
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

    // console.log(sheetData);

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
        range: "Помічники!A:H",
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
