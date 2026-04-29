import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "https://d37tqlpr481e10.cloudfront.net"
   },
  body: JSON.stringify(body),
});

const parseBody = (event) => {
  if (!event?.body) return null;
  if (typeof event.body === "string") {
    try {
      return JSON.parse(event.body);
    } catch {
      return "__INVALID_JSON__";
    }
  }
  return event.body;
};

const isIsoDateYYYYMMDD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const isPriority = (s) => ["low", "medium", "high"].includes(s);
const isStatus = (s) => ["pending", "done"].includes(s);

export const handler = async (event) => {
  try {
    if (!TABLE_NAME) return json(500, { message: "Missing TABLE_NAME env" });

    const payload = parseBody(event);
    if (payload === "__INVALID_JSON__") return json(400, { message: "Invalid JSON body" });
    if (!payload) return json(400, { message: "Missing request body" });

    const { userId, title, description, priority, dueDate, status } = payload;

    if (!userId || typeof userId !== "string") return json(400, { message: "userId is required (string)" });
    if (!title || typeof title !== "string") return json(400, { message: "title is required (string)" });

    if (description !== undefined && typeof description !== "string") {
      return json(400, { message: "description must be a string" });
    }
    if (priority !== undefined && !isPriority(priority)) {
      return json(400, { message: "priority must be one of: low, medium, high" });
    }
    if (dueDate !== undefined && !isIsoDateYYYYMMDD(dueDate)) {
      return json(400, { message: "dueDate must be ISO format YYYY-MM-DD (e.g. 2025-06-15)" });
    }
    if (status !== undefined && !isStatus(status)) {
      return json(400, { message: "status must be one of: pending, done" });
    }

    const now = new Date().toISOString();
    const taskId = randomUUID();

    const item = {
      taskId,
      userId,
      title,
      description: description ?? null,
      priority: priority ?? "medium",
      dueDate: dueDate ? dueDate.slice(0, 10) : null,
      status: status ?? "pending",
      createdAt: now,
    };

    const result = await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(taskId)",
      })
    );
    
    console.log("DynamoDB PutItem success:", {
      statusCode: result?.$metadata?.httpStatusCode,
      requestId: result?.$metadata?.requestId,
    });

    return json(201, item);
  } catch (err) {
    console.error("createTask error:", err);
    return json(500, { message: "Internal Server Error" });
  }
};