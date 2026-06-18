import fs from 'fs';
import path from 'path';

export function validateEnv() {
  const examplePath = path.join(process.cwd(), '.env.example');

  // Check if .env.example exists
  if (!fs.existsSync(examplePath)) {
    console.error('.env.example file not found!');
    process.exit(1);
  }

  const exampleContent = fs.readFileSync(examplePath, 'utf-8');
  const requiredKeys = exampleContent
    .split('\n')
    .filter(line => line && !line.startsWith('#')) // Filter out empty lines and comments
    .map(line => line.split('=')[0].trim()); // Get only the variable names

  const missingVars = requiredKeys.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(
      `Missing environment variables: ${missingVars.join(', ')}`
    );
    process.exit(1); // Exit the process with an error code
  }
}
