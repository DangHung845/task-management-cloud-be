import { ddbDocClient } from "../utils/database.js";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

export const editTask = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const { taskId } = event.pathParameters;
        if (!taskId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Task ID is required" })
            };
        }

        const updateExpression = [];
        const expressionAttributeValues = {};
        if (data.title) {
            updateExpression.push("title = :title");
            expressionAttributeValues[":title"] = data.title;
        }

        if (data.description) {
            updateExpression.push("description = :description");
            expressionAttributeValues[":description"] = data.description;
        }

        if (data.priority) {
            updateExpression.push("priority = :priority");
            expressionAttributeValues[":priority"] = data.priority;
        }

        if (data.dueDate) {
            updateExpression.push("dueDate = :dueDate");
            expressionAttributeValues[":dueDate"] = data.dueDate;
        }

        if (data.status) {
            updateExpression.push("status = :status");
            expressionAttributeValues[":status"] = data.status;
        }

        if (data.userId) {
            updateExpression.push("userId = :userId");
            expressionAttributeValues[":userId"] = data.userId;
        }

        if (updateExpression.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "At least one field (title, description, priority, dueDate) must be provided for update" })
            };
        }
    
        const command = new UpdateCommand({
            TableName: "Tasks",
            Key: { taskId },
            UpdateExpression: "set " + updateExpression.join(", "),
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW"
        });

        const result = await ddbDocClient.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify(result.Attributes)
        };
    }
    catch (error) {
        console.error("Error updating task:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};