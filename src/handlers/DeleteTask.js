import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

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

export const handler = async (event) => {
  try {
    if (!TABLE_NAME) return json(500, { message: "Missing TABLE_NAME env" });

    const taskId = event?.pathParameters?.id || event?.pathParameters?.taskId;
    if (!taskId) return json(400, { message: "Missing path parameter: id (taskId)" });

    const result = await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { taskId },
        ConditionExpression: "attribute_exists(taskId)", // not found => 404
      })
    );

    console.log("DynamoDB delete item success:", {
      statusCode: result?.$metadata?.httpStatusCode,
      requestId: result?.$metadata?.requestId,
    });

    return json(200, { message: "Deleted", taskId });
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      return json(404, { message: "Task not found" });
    }
    console.error("deleteTaskById error:", err);
    return json(500, { message: "Internal Server Error" });
  }
};