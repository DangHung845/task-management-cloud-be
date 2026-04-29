import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

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

const GSI_USERID_NAME = process.env.GSI_USERID_NAME;

export const handler = async (event) => {
  try {
    if (!TABLE_NAME) return json(500, { message: "Missing TABLE_NAME env" });

    const userId = event?.queryStringParameters?.userId;

    // If userId provided -> query GSI
    if (userId) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI_USERID_NAME,
          KeyConditionExpression: "#userId = :userId",
          ExpressionAttributeNames: { "#userId": "userId" },
          ExpressionAttributeValues: { ":userId": userId },
        })
      );

      return json(200, { items: out.Items ?? [], count: out.Count ?? 0, userId });
    }

    // Otherwise fallback to Scan (not ideal for large tables)
    const out = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
    return json(200, { items: out.Items ?? [], count: out.Count ?? 0 });
  } catch (err) {
    console.error("getAllTask error:", err);
    return json(500, { message: "Internal Server Error" });
  }
};