import { ddbDocClient } from "../utils/database.js";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

export const deleteTask = async (event) => {
    try {
        const { taskId } = event.pathParameters;
        if (!taskId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Task ID is required" })
            };
        }

        const command = new DeleteCommand({
            TableName: "Tasks",
            Key: { taskId }
        });
        await ddbDocClient.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Task deleted successfully" })
        };
    }
    catch (error) {
        console.error("Error deleting task:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};