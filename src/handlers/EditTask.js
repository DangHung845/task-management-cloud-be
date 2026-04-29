import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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
const isStatus = (s) => ["pending","doing", "done"].includes(s);

export const handler = async (event) => {
  try {
    if (!TABLE_NAME) return json(500, { message: "Missing TABLE_NAME env" });

    const taskId = event?.pathParameters?.id || event?.pathParameters?.taskId;
    if (!taskId) return json(400, { message: "Missing path parameter: id (taskId)" });

    const payload = parseBody(event);
    if (payload === "__INVALID_JSON__") return json(400, { message: "Invalid JSON body" });
    if (!payload) return json(400, { message: "Missing request body" });

    const { userId, title, description, priority, dueDate, status } = payload;

    // IMPORTANT: userId shouldn't change normally; only allow if provided as a guard
    // If you want to forbid changing owner, remove this section and don't update userId.
    if (userId !== undefined && (typeof userId !== "string" || !userId)) {
      return json(400, { message: "userId must be a non-empty string if provided" });
    }
    if (title !== undefined && typeof title !== "string") return json(400, { message: "title must be a string" });
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
      return json(400, { message: "status must be one of: pending, doing, done" });
    }

    const sets = [];
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    if (userId !== undefined) {
      ExpressionAttributeNames["#userId"] = "userId";
      ExpressionAttributeValues[":userId"] = userId;
      sets.push("#userId = :userId");
    }
    if (title !== undefined) {
      ExpressionAttributeNames["#title"] = "title";
      ExpressionAttributeValues[":title"] = title;
      sets.push("#title = :title");
    }
    if (description !== undefined) {
      ExpressionAttributeNames["#description"] = "description";
      ExpressionAttributeValues[":description"] = description;
      sets.push("#description = :description");
    }
    if (priority !== undefined) {
      ExpressionAttributeNames["#priority"] = "priority";
      ExpressionAttributeValues[":priority"] = priority;
      sets.push("#priority = :priority");
    }
    if (dueDate !== undefined) {
      ExpressionAttributeNames["#dueDate"] = "dueDate";
      ExpressionAttributeValues[":dueDate"] = dueDate.slice(0, 10);
      sets.push("#dueDate = :dueDate");
    }
    if (status !== undefined) {
      ExpressionAttributeNames["#status"] = "status";
      ExpressionAttributeValues[":status"] = status;
      sets.push("#status = :status");
    }

    if (sets.length === 0) {
      return json(400, { message: "No updatable fields provided" });
    }

    const out = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { taskId },
        UpdateExpression: "SET " + sets.join(", "),
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ConditionExpression: "attribute_exists(taskId)", // not found => 404
        ReturnValues: "ALL_NEW",
      })
    );

    return json(200, out.Attributes ?? {});
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      console.log("Error:", err.name);
      return json(404, { message: "Task not found" });
    }
    console.error("updateTaskById error:", err);
    return json(500, { message: "Internal Server Error" });
  }
};