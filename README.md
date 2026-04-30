# Task Management Cloud Backend

A serverless backend API for managing tasks, built with Node.js, AWS Lambda, and DynamoDB.

## Project Structure

```
task-management-cloud-be/
├── src/
│   ├── handlers/
│   │   ├── CreateTask.js     # Creates a new task in DynamoDB
│   │   ├── DeleteTask.js     # Deletes a task by taskId
│   │   ├── EditTask.js       # Updates fields of an existing task
│   │   └── GetTask.js        # Retrieves all tasks
│   └── utils/
│       └── database.js       # DynamoDB client configuration
├── .env                      # Environment variables (not committed)
├── .gitignore
├── index.js                  # Local entry point for testing
├── package.json
└── package-lock.json
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v8 or higher
- [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) (for running locally)
- An AWS account (for deployment)

---

## Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start DynamoDB Local

Download and run DynamoDB Local on port `8000` (the default). You can use the JAR file directly:

```bash
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

Or use Docker:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

> The `database.js` is already configured to connect to `http://localhost:8000` with local fake credentials.

### 3. Create the Tasks table in DynamoDB Local

Using [NoSQL Workbench](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.settingup.html) or the AWS console pointed at localhost, create a table with:

- **Table name:** `Tasks`
- **Partition key:** `taskId` (String)

### 4. Run the app

```bash
npm start
```

This runs `index.js`, which fires example `createTask` and `getTask` calls against your local DynamoDB to verify everything is working.

---

## Deploying to AWS (Console)

### Step 1 — Set up DynamoDB on AWS

1. Go to the [AWS DynamoDB Console](https://console.aws.amazon.com/dynamodb)
2. Click **Create table**
3. Set:
   - **Table name:** `Tasks`
   - **Partition key:** `taskId` (String)
4. Click **Create table**

### Step 2 — Update `database.js` for production

Before packaging, update `src/utils/database.js` to remove the local endpoint and fake credentials:

```js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

export const ddbDocClient = DynamoDBDocumentClient.from(client);
```

> In production, Lambda uses its IAM role for credentials — no hardcoded keys needed.

### Step 3 — Package the project

Zip the entire project folder (including `node_modules`):

- On **Windows**: Right-click the project folder → **Send to** → **Compressed (zipped) folder**
- On **Mac**: Right-click → **Compress**

Make sure `index.js`, `src/`, `node_modules/`, and `package.json` are all at the root of the zip.

### Step 4 — Create Lambda functions

For each handler (`CreateTask`, `DeleteTask`, `EditTask`, `GetTask`), repeat these steps:

1. Go to the [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Click **Create function** → **Author from scratch**
3. Set:
   - **Function name:** e.g. `createTask`
   - **Runtime:** Node.js 18.x or higher
4. Click **Create function**
5. Under **Code source**, click **Upload from** → **.zip file** and upload your zip
6. Set the **Handler** to match each file:

| Function | Handler value |
|---|---|
| createTask | `src/handlers/CreateTask.createTask` |
| getTask | `src/handlers/GetTask.getTask` |
| editTask | `src/handlers/EditTask.editTask` |
| deleteTask | `src/handlers/DeleteTask.deleteTask` |

### Step 5 — Set IAM permissions

Each Lambda function needs permission to access DynamoDB:

1. In the Lambda function page, go to **Configuration** → **Permissions**
2. Click the IAM role link
3. Click **Add permissions** → **Attach policies**
4. Attach **AmazonDynamoDBFullAccess** (or a scoped policy for the `Tasks` table only)

### Step 6 — Set up API Gateway

1. Go to the [API Gateway Console](https://console.aws.amazon.com/apigateway)
2. Click **Create API** → **REST API**
3. Create resources and methods:

| Resource | Method | Lambda Function |
|---|---|---|
| `/tasks` | GET | `getTask` |
| `/tasks` | POST | `createTask` |
| `/tasks/{taskId}` | PUT | `editTask` |
| `/tasks/{taskId}` | DELETE | `deleteTask` |

4. For each method, select **Lambda Function** as the integration type and link the corresponding function
5. Click **Deploy API** → create a new stage (e.g. `prod`)
6. Copy the **Invoke URL** — this is your base API URL

---

## API Reference

### Task Object

```json
{
  "taskId": "uuid",
  "title": "string",
  "description": "string",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 timestamp",
  "userId": "string",
  "status": "pending | in-progress | completed",
  "createdAt": "ISO 8601 timestamp"
}
```

### Endpoints

#### GET /tasks
Returns all tasks.

**Response `200`:**
```json
[{ "taskId": "...", "title": "...", "status": "pending", ... }]
```

#### POST /tasks
Creates a new task.

**Request body:**
```json
{
  "title": "string",       
  "userId": "string",      
  "description": "string", 
  "priority": "string",    
  "dueDate": "string"      
}
```
> `title` and `userId` are required.

**Response `201`:** Returns the created task object.

#### PUT /tasks/{taskId}
Updates an existing task. At least one field must be provided.

**Request body (all optional):**
```json
{
  "title": "string",
  "description": "string",
  "priority": "string",
  "dueDate": "string",
  "status": "string",
  "userId": "string"
}
```

**Response `200`:** Returns the updated task object.

#### DELETE /tasks/{taskId}
Deletes a task by ID.

**Response `200`:**
```json
{ "message": "Task deleted successfully" }
```

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Run locally with example task creation |
| `npm run dev` | Run locally with nodemon (auto-restart) |