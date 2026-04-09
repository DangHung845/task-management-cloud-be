import'dotenv/config';
import { ddbDocClient } from './src/utils/database.js';
import { createTask } from './src/handlers/CreateTask.js';
import { getTask } from './src/handlers/GetTask.js';
import { editTask } from './src/handlers/EditTask.js';
import { deleteTask } from './src/handlers/DeleteTask.js';

//Example task to create a task when the application starts
const exampleTask = {
    "title": "Example Task",
    "description": "This is an example task created on application startup.",
    "priority": "medium",
    "dueDate": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
    "userId": "example-user-id"
};

const mockEvent = {
    body: JSON.stringify(exampleTask)
};

createTask(mockEvent).then(response => {
    console.log("Task creation response:", response);
}).catch(error => {
    console.error("Error creating task on startup:", error);
});

//get task example
getTask({}).then(response => {
    console.log("Get tasks response:", response);
}).catch(error => {
    console.error("Error fetching tasks on startup:", error);
});


