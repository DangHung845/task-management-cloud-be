import { ddbDocClient } from "../utils/database.js";
import { ScanCommand } from "@aws-sdk/client-dynamodb"; 

export const getTask = async (event) => {
    try {
        const command = new ScanCommand({
            TableName: "Tasks"
        });
        const data = await ddbDocClient.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items)
        };
    }
    catch (error) {
        console.error("Error fetching tasks:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};