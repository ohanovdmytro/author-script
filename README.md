# Node.js App: PostgreSQL to Google Sheets

This Node.js app connects to a PostgreSQL database, performs a query, and then loads the data into a Google Sheet using Google Sheets API.

## Prerequisites

1. **PostgreSQL Database:**
   - Set up a PostgreSQL database.
   - Create a table or use an existing table.

2. **Environment Variables:**
   - Create a `.env` file in your project with the following variables:

     ```env
     PG_HOST=<your-postgres-host>
     PG_PORT=<your-postgres-port>
     PG_DATABASE=<your-postgres-database>
     PG_USER=<your-postgres-username>
     PG_PASSWORD=<your-postgres-password>

     GOOGLE_SHEET_ID=<your-google-sheet-id>
     GOOGLE_CLIENT_ID=<your-google-client-id>
     GOOGLE_CLIENT_SECRET=<your-google-client-secret>
     GOOGLE_REDIRECT_URI=<your-google-redirect-uri>
     ```

3. **Google Sheets API:**
   - Enable the Google Sheets API in the Google Cloud Console.
   - Create a service account, download the JSON key, and share the Google Sheet with the service account email.

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd path/to/project

# Install dependencies
npm install
