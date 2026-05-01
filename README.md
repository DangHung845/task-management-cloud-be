# task-management-cloud-be

Serverless Node.js backend for task management. Handlers live in `src/handlers` and use DynamoDB via the AWS SDK v3.

**Contents**

- `index.js` — local entrypoint (examples)
- `src/handlers/*` — Lambda handlers (export `handler`)
- `src/utils/database.js` — DynamoDB client helper

## Prerequisites

- Node.js v18+ and npm
- An AWS account and permissions to create Lambda, API Gateway and DynamoDB resources

## Run locally

1. Install dependencies

```bash
npm install
```

2. Create a local `.env` (not committed) and set the required variables. At minimum you will need:

- `TABLE_NAME` — name of the DynamoDB table used by the handlers

Example `.env` (adjust keys as needed):

```
TABLE_NAME=tasks-table
```

3. Start the project

```bash
npm start
```

`index.js` in this repo runs quick example calls to the handlers for local testing. The handlers themselves export a `handler` function suitable for AWS Lambda (for example `src/handlers/CreateTask.handler`).

## Packaging for Lambda (zip)

Prepare a deployment package that includes `node_modules` and your source files:

```bash
# install production deps
npm install --production

# create zip (from project root)
zip -r function.zip index.js package.json package-lock.json src node_modules
```

You can upload `function.zip` to the Lambda console or to S3 and point Lambda to it.

## Deploy to AWS (no CLI) — Lambda + API Gateway (Console)

Follow these steps in the AWS Management Console to deploy without using the AWS CLI:

1. Create or prepare your DynamoDB table
  - Open the DynamoDB console and create a table (example name `tasks-table`)
  - Primary key: `taskId` (String)

2. Create an IAM Role for Lambda
  - Open the IAM console → Roles → Create role
  - Choose **AWS service** → **Lambda**
  - Attach these managed policies (or create a least-privilege policy):
    - `AWSLambdaBasicExecutionRole` (logs)
    - `AmazonDynamoDBFullAccess` (or a scoped policy allowing PutItem/GetItem/Query on your table)
  - Finish and note the role name (e.g., `task-lambda-role`).

3. Create the Lambda function
  - Open the Lambda console → Create function → **Author from scratch**
  - Runtime: **Node.js 18.x**
  - Architecture: x86_64 or arm64 as preferred
  - Function name: e.g., `task-create` (create one per handler or use a single function that routes)
  - Execution role: Choose existing role → select the role created above

4. Upload your code package
  - In the **Code** area, choose **Upload from** → `.zip file` and upload `function.zip`
  - Set the handler to the correct export, for example: `src/handlers/CreateTask.handler` (format is `<file-path-without-extension>.<exportName>`)
    - Example: If you make a function for creating tasks, set handler to `src/handlers/CreateTask.handler`.
  - Set runtime settings if needed (Node.js 18, timeout, memory)

5. Configure environment variables
  - In the Lambda function → Configuration → Environment variables add:
    - `TABLE_NAME = tasks-table`
    - Any other secrets/values your handlers need

6. (Optional) If your function needs network access to RDS or a VPC resource, configure the VPC in the function's configuration.

7. Create an API Gateway to expose the function
  - Open API Gateway → Create API → **REST API** 
  - Add an integration → Lambda function → choose the function you created
  - Create routes matching your endpoints, for example:
    - `POST /tasks` → `task-create` Lambda
    - `GET /tasks/{id}` → `task-get` Lambda
    - `PUT /tasks/{id}` → `task-edit` Lambda
    - `DELETE /tasks/{id}` → `task-delete` Lambda
  - Deploy the API and note the invoke URL
  - Configure CORS on each route if the frontend will call the API from a browser

8. Grant API Gateway permission to invoke your Lambda
  - If you used the Console integration wizard this is usually handled automatically. If not, add a resource-based policy to the Lambda to allow API Gateway to invoke it.

9. Test
  - Use the Lambda console's **Test** tool or the API Gateway invoke URL to send requests
  - Check CloudWatch logs for any runtime errors

Notes and tips

- Handler export: each handler file in `src/handlers` exports `handler`. When creating a Lambda function that points to a handler inside a subfolder set the handler value like `src/handlers/CreateTask.handler`.
- CORS: the project sets `Access-Control-Allow-Origin` in the handler (currently to a specific CloudFront domain). Update or remove that header to match your frontend origin or to `*` for quick testing.
- Large packages: if your zip is large, upload the zip to S3 and use **Upload from Amazon S3** in the Lambda console.
- Permissions: prefer least-privilege IAM policies scoped to the exact DynamoDB table and actions required.

## Environment variables reference

- `TABLE_NAME` — DynamoDB table name
- (Add additional keys your environment needs)

## Useful Console locations

- Lambda: https://console.aws.amazon.com/lambda/
- API Gateway: https://console.aws.amazon.com/apigateway/
- DynamoDB: https://console.aws.amazon.com/dynamodb/
- IAM: https://console.aws.amazon.com/iam/

## Next steps

- Create separate Lambda functions per handler or use a single router function
- Set up CI/CD (CodePipeline, GitHub Actions, or other) for automated deploys

