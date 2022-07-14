import dotenv from "dotenv";

dotenv.config();

export function getEnvVariable(key: string, defaultValue?: string): string {
    if (process.env[key]) {
        return process.env[key] ?? "";
    }
    if (!defaultValue) {
        throw new Error(`${key} is not defined and no default value was provided`);
    }
    return defaultValue;
};