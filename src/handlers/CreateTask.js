import { ddbDocClient } from "../utils/database.js";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

export const createTask = async (event) => {
    try {
        const data = JSON.parse(event.body);
        if (!data.title || !data.userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Title and userId are required" })
            };
        }

        const task = {
            taskId: uuidv4(),
            title: data.title,
            description: data.description,
            priority: data.priority,
            dueDate: data.dueDate,
            userId: data.userId,
            status: "pending",
            createdAt: new Date().toISOString()
        };

        const command = new PutCommand({
            TableName: "Tasks",
            Item: task
        });

        await ddbDocClient.send(command);

        return {
            statusCode: 201,
            body: JSON.stringify(task)
        };
    } catch (error) {
        console.error("Error creating task:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};
