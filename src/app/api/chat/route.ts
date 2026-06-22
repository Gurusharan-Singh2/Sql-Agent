import { db } from '@/db/db';
import { createGroq } from '@ai-sdk/groq';
import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import z from 'zod';


export const maxDuration = 30;

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const SYSTEM_PROMPT = `You are an expert SQL assistant that helps users to query their database using natural language.

    ${new Date().toLocaleString('sv-SE')}
    You have access to following tools:
    1. db tool - call this tool to query the database.
    2. schema tool - call this tool to get the database schema which will help you to write sql query.

Rules:
- Generate ONLY SELECT queries (no INSERT, UPDATE, DELETE, DROP)
- Always use the schema provided by the schema tool
- Pass in valid SQL syntax in db tool.
- IMPORTANT: To query database call db tool, Don't return just SQL query.

Always respond in a helpful, conversational tone while being technically accurate.`;

    const recentMessages = messages.slice(-10);

    const result = streamText({
        model: groq('llama-3.3-70b-versatile'),
        messages: await convertToModelMessages(recentMessages),
        system: SYSTEM_PROMPT,
        stopWhen: stepCountIs(5),
        tools: {
            schema: tool({
                description: 'Call this tool to get database schema information.',
                inputSchema: z.object({}),
                execute: async () => {
                    try {
                        const [tables] = await db.raw('SHOW TABLES');
                        let schemaString = '';
                        
                        for (const tableObj of (tables as Record<string, unknown>[])) {
                            const tableName = Object.values(tableObj)[0] as string;
                            const [createTableRows] = await db.raw(`SHOW CREATE TABLE \`${tableName}\``);
                            const createTableSql = (createTableRows as Record<string, string>[])[0]['Create Table'];
                            schemaString += createTableSql + ';\n\n';
                        }
                        
                        return schemaString.substring(0, 5000) || 'No tables found in the database.';
                    } catch (error: unknown) {
                        return `Error fetching schema: ${error instanceof Error ? error.message : String(error)}`;
                    }
                },
            }),
            db: tool({
                description: 'Call this tool to query a database.',
                inputSchema: z.object({
                    query: z.string().describe('The SQL query to be ran.'),
                }),
                execute: async ({ query }) => {
                    console.log('Query', query);
                    
                    const [rows] = await db.raw(query);
                    const safeRows = Array.isArray(rows) ? rows.slice(0, 20) : rows;
                    return safeRows;
                },
            }),
        },
    });

    return result.toUIMessageStreamResponse();
}
