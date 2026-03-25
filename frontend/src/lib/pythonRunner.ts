import { spawn, SpawnOptions } from "child_process";
import { execSync } from "child_process";
import path from "path";
import { existsSync } from "fs";

/**
 * Find Python executable in the system
 * Tries environment variable first, then common locations
 */
function findPythonExecutable(): string {
    // 1. Check environment variable
    if (process.env.PYTHON_EXECUTABLE && existsSync(process.env.PYTHON_EXECUTABLE)) {
        return process.env.PYTHON_EXECUTABLE;
    }

    // 2. Try using 'which' or 'where' command
    try {
        const cmd = process.platform === "win32" ? "where python" : "which python3";
        const result = execSync(cmd, { encoding: "utf-8" }).trim();
        if (result && existsSync(result)) {
            return result;
        }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_) {
        // Command failed, continue to next method
    }

    // 3. Check common locations
    const commonPaths: { [key: string]: string[] } = {
        win32: [
            "C:\\Python311\\python.exe",
            "C:\\Python310\\python.exe",
            "C:\\Python39\\python.exe",
            path.join(process.env.APPDATA || "", "..", "Local", "Programs", "Python", "Python311", "python.exe"),
        ],
        linux: ["/usr/bin/python3", "/usr/local/bin/python3"],
        darwin: ["/usr/local/bin/python3", "/opt/homebrew/bin/python3"],
    };

    const platform = process.platform as keyof typeof commonPaths;
    const paths = commonPaths[platform] || [];

    for (const p of paths) {
        if (existsSync(p)) {
            return p;
        }
    }

    // 4. Fallback - assume python is in PATH
    return process.platform === "win32" ? "python" : "python3";
}

/**
 * Get Python script path
 * Tries environment variable first, then uses relative path
 */
function getPythonScriptPath(): string {
    if (process.env.PYTHON_SCRIPT_PATH) {
        // If absolute path
        if (path.isAbsolute(process.env.PYTHON_SCRIPT_PATH)) {
            return process.env.PYTHON_SCRIPT_PATH;
        }
        // If relative path
        return path.join(process.cwd(), process.env.PYTHON_SCRIPT_PATH);
    }

    // Default relative path from project root
    return path.join(process.cwd(), "..", "backend", "pipeline", "main.py");
}

interface SpawnPythonOptions {
    scriptPath?: string;
    pythonExecutable?: string;
    args?: string[];
    detached?: boolean;
    logOutput?: boolean;
}

/**
 * Spawn a Python process with environment-based configuration
 */
export async function spawnPythonProcess(
    options: SpawnPythonOptions = {}
): Promise<{ success: boolean; pid?: number; error?: string }> {
    const {
        scriptPath = getPythonScriptPath(),
        pythonExecutable = findPythonExecutable(),
        args = [],
        detached = true,
        logOutput = true,
    } = options;

    try {
        // Validate script exists
        if (!existsSync(scriptPath)) {
            throw new Error(`Python script not found: ${scriptPath}`);
        }

        console.log(`🐍 Spawning Python process...`);
        console.log(`   Executable: ${pythonExecutable}`);
        console.log(`   Script: ${scriptPath}`);
        console.log(`   Args: ${args.join(" ")}`);

        const spawnOptions: SpawnOptions = {
            shell: true,
            detached,
            stdio: ["ignore", "pipe", "pipe"],
            // Pass through important environment variables
            env: {
                ...process.env,
                PYTHONUNBUFFERED: "1", // Unbuffered output
            },
        };

        const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args], spawnOptions);

        const pid = pythonProcess.pid;

        if (logOutput) {
            pythonProcess.stdout?.on("data", (data) => {
                console.log(`🐍 [STDOUT]: ${data.toString().trim()}`);
            });

            pythonProcess.stderr?.on("data", (data) => {
                console.error(`🐍 [STDERR]: ${data.toString().trim()}`);
            });

            pythonProcess.on("error", (err) => {
                console.error(`❌ Failed to start Python process:`, err);
            });

            pythonProcess.on("close", (code) => {
                console.log(`🐍 Python process exited with code ${code}`);
            });
        }

        // Allow Node process to exit without waiting for Python child
        if (detached) {
            pythonProcess.unref();
        }

        return { success: true, pid };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Error spawning Python process: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
}

export { findPythonExecutable, getPythonScriptPath };
