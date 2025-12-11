#!/usr/bin/env node

const { program } = require("commander");
const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const package = require("./package.json");

// ANSI color codes for terminal output
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// Helper function for colorized logging
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to execute commands and log output
function executeCommand(command, options = {}) {
  try {
    log(`Executing: ${command}`, "green");

    // If logFile is specified, write output to file
    if (options.logFile) {
      const logPath = path.isAbsolute(options.logFile)
        ? options.logFile
        : path.join(process.cwd(), options.logFile);

      // Write command header to log file
      fs.appendFileSync(logPath, `\n${"=".repeat(80)}\n`);
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Executing: ${command}\n`);
      fs.appendFileSync(logPath, `${"=".repeat(80)}\n\n`);

      // Use spawnSync to capture both stdout and stderr synchronously
      // This is necessary because Jest writes to stderr, and execSync only captures stderr on error
      // When shell: true, pass command as a single string
      const result = spawnSync(command, {
        cwd: options.cwd || process.cwd(),
        shell: true,
        stdio: ["inherit", "pipe", "pipe"],
        encoding: "utf8",
      });

      const stdout = result.stdout || "";
      const stderr = result.stderr || "";

      // Combine stdout and stderr (Jest writes to stderr)
      const combinedOutput = stdout + (stderr ? stderr : "");

      // Write output to log file
      if (combinedOutput) {
        fs.appendFileSync(logPath, combinedOutput);
      }

      // Also show output in console
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);

      // Check exit code
      if (result.status !== 0) {
        const error = new Error(`Command failed with exit code ${result.status}`);
        error.stdout = stdout;
        error.stderr = stderr;
        throw error;
      }

      return true;
    } else {
      // Normal execution without logging
      const output = execSync(command, {
        stdio: options.stdio || "inherit",
        cwd: options.cwd || process.cwd(),
      });
      if (options.stdio === "pipe") {
        return output.toString().trim();
      }
      return true;
    }
  } catch (error) {
    // Write error to log file if specified
    if (options.logFile) {
      const logPath = path.isAbsolute(options.logFile)
        ? options.logFile
        : path.join(process.cwd(), options.logFile);
      fs.appendFileSync(logPath, `\n[ERROR] ${error.message}\n`);
      if (error.stdout) {
        fs.appendFileSync(logPath, `\n--- STDOUT ---\n${error.stdout.toString()}\n`);
        process.stdout.write(error.stdout.toString());
      }
      if (error.stderr) {
        fs.appendFileSync(logPath, `\n--- STDERR ---\n${error.stderr.toString()}\n`);
        process.stderr.write(error.stderr.toString());
      }
    }

    if (options.ignoreError) {
      log(`Command failed but continuing: ${error.message}`, "yellow");
      return false;
    }
    log(`Error executing command: ${error.message}`, "red");
    process.exit(1);
  }
}

// Check if .env files exist, create from examples if not
function setupEnvFiles() {
  const backendEnvPath = path.join(process.cwd(), "backend", ".env");
  const frontendEnvPath = path.join(process.cwd(), "frontend", ".env");
  const backendEnvExamplePath = path.join(
    process.cwd(),
    "backend",
    ".env.example"
  );
  const frontendEnvExamplePath = path.join(
    process.cwd(),
    "frontend",
    ".env.example"
  );

  if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExamplePath)) {
    log("Creating backend/.env from example", "yellow");
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
  }

  if (
    !fs.existsSync(frontendEnvPath) &&
    fs.existsSync(frontendEnvExamplePath)
  ) {
    log("Creating frontend/.env from example", "yellow");
    fs.copyFileSync(frontendEnvExamplePath, frontendEnvPath);
  }
}

// Check if docker daemon is available
function isDockerAvailable() {
  try {
    execSync("docker ps", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if docker is running and containers exist
function isDockerRunning() {
  try {
    const output = execSync("docker ps", { stdio: "pipe" });
    return (
      output.toString().includes("repair-tix-api") ||
      output.toString().includes("repair-tix-db") ||
      output.toString().includes("repair-tix-client")
    );
  } catch (error) {
    return false;
  }
}

// Get container status
function getContainerStatus() {
  try {
    const output = execSync("docker ps -a --format 'table {{.Names}}\t{{.Status}}'", {
      stdio: "pipe",
    });
    return output.toString();
  } catch (error) {
    return "Error checking container status";
  }
}

// Check if a specific container is running
function isContainerRunning(containerName) {
  try {
    const output = execSync("docker ps --format '{{.Names}}'", { stdio: "pipe" });
    return output.toString().includes(containerName);
  } catch (error) {
    return false;
  }
}

// Version information
program
  .version(package.version)
  .description("CLI for Electronics Repair Business Management System");

// Main application commands
program
  .command("dev")
  .description("Start development environment with live logs")
  .option("-d, --detached", "Run in detached mode (no logs)")
  .action((options) => {
    log("Starting development environment...", "green");

    // Set up environment files
    setupEnvFiles();

    // Build and start containers
    log("Building and starting containers in development mode...", "green");
    executeCommand("docker-compose up --build -d");

    // Show logs if not in detached mode
    if (!options.detached) {
      log(
        "Showing logs (Ctrl+C to exit logs, containers will keep running)",
        "green"
      );

      // Use spawn to handle the logs in a way that allows for proper Ctrl+C handling
      const logs = spawn("docker-compose", ["logs", "-f"], {
        stdio: "inherit",
      });

      // Handle SIGINT (Ctrl+C) to allow graceful exit while keeping containers running
      process.on("SIGINT", () => {
        log("Exiting logs. Containers are still running.", "yellow");
        logs.kill();
        process.exit(0);
      });
    } else {
      log("Development environment is running in detached mode", "green");
      log("Use 'docker-compose logs -f' to view logs if needed", "yellow");
    }
  });

program
  .command("start")
  .description("Build and run the application in production mode")
  .action(() => {
    log("Starting application in production mode...", "blue");
    executeCommand("docker-compose down");
    executeCommand("NODE_ENV=production docker-compose up --build -d");
    log("Production application is running in the background!", "blue");
    log("- Frontend: http://localhost:3000");
    log("- Backend API: http://localhost:4000");
  });

program
  .command("stop")
  .description("Stop running containers")
  .option("-r, --remove", "Stop and remove containers")
  .action((options) => {
    if (options.remove) {
      log("Stopping and removing containers...", "yellow");
      executeCommand("docker-compose down");
      log("Containers stopped and removed.", "green");
    } else {
      log("Stopping containers...", "yellow");
      executeCommand("docker-compose stop");
      log(
        "Containers stopped. Use 'npm run dev' or 'npm run start' to start them again.",
        "green"
      );
    }
  });

program
  .command("cleanup")
  .description(
    "Clean up Docker resources (removes all containers, volumes, and images)"
  )
  .action(() => {
    log("Cleaning up Docker resources...", "yellow");
    executeCommand("docker-compose down", { ignoreError: true });
    executeCommand("docker system prune -a -f --volumes");
    log("Cleanup complete!", "green");
  });

// Database management commands
program
  .command("db")
  .description("Database management commands")
  .addHelpText(
    "after",
    `
  Examples:
    $ repair-tix db:migrate         # Run all pending migrations
    $ repair-tix db:migrate:undo    # Undo the last migration
    $ repair-tix db:reset           # Reset the database (undo all, then migrate)
    $ repair-tix db:seed            # Seed the database
    $ repair-tix db:backup          # Create a database backup
    $ repair-tix db:restore <file>  # Restore database from backup
  `
  );

program
  .command("db:migrate")
  .description("Run database migrations")
  .action(() => {
    if (isContainerRunning("repair-tix-api")) {
      log("Running migrations inside Docker container...", "green");
      executeCommand("docker exec repair-tix-api npx sequelize-cli db:migrate");
    } else {
      log("Running migrations locally...", "green");
      executeCommand("npx sequelize-cli db:migrate", {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

program
  .command("db:migrate:undo")
  .description("Undo the last database migration")
  .option("-a, --all", "Undo all migrations")
  .action((options) => {
    const command = options.all ? "db:migrate:undo:all" : "db:migrate:undo";

    if (isContainerRunning("repair-tix-api")) {
      log(`Undoing migrations inside Docker container...`, "green");
      executeCommand(`docker exec repair-tix-api npx sequelize-cli ${command}`);
    } else {
      log(`Undoing migrations locally...`, "green");
      executeCommand(`npx sequelize-cli ${command}`, {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

program
  .command("db:reset")
  .description("Reset database (undo all migrations, then migrate)")
  .action(() => {
    log("Resetting database...", "yellow");

    if (isContainerRunning("repair-tix-api")) {
      executeCommand(
        "docker exec repair-tix-api npx sequelize-cli db:migrate:undo:all"
      );
      executeCommand("docker exec repair-tix-api npx sequelize-cli db:migrate");
      log("Database reset complete!", "green");
    } else {
      executeCommand("npx sequelize-cli db:migrate:undo:all", {
        cwd: path.join(process.cwd(), "backend"),
      });
      executeCommand("npx sequelize-cli db:migrate", {
        cwd: path.join(process.cwd(), "backend"),
      });
      log("Database reset complete!", "green");
    }
  });

program
  .command("db:seed")
  .description("Seed the database with initial data")
  .option("-u, --undo", "Undo all seeds")
  .action((options) => {
    const command = options.undo ? "db:seed:undo:all" : "db:seed:all";

    if (isContainerRunning("repair-tix-api")) {
      log(
        `${
          options.undo ? "Undoing" : "Running"
        } seeds inside Docker container...`,
        "green"
      );
      executeCommand(`docker exec repair-tix-api npx sequelize-cli ${command}`);
    } else {
      log(`${options.undo ? "Undoing" : "Running"} seeds locally...`, "green");
      executeCommand(`npx sequelize-cli ${command}`, {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

// Container management commands
program
  .command("status")
  .description("Show status of all containers")
  .action(() => {
    log("Container Status:", "blue");
    console.log(getContainerStatus());
  });

program
  .command("logs")
  .description("View logs from containers")
  .option("-s, --service <service>", "View logs for specific service (backend, frontend, db)")
  .option("-f, --follow", "Follow log output")
  .option("-t, --tail <number>", "Number of lines to show from the end", "100")
  .action((options) => {
    const services = {
      backend: "repair-tix-api",
      frontend: "repair-tix-client",
      db: "repair-tix-db",
    };

    if (options.service && !services[options.service]) {
      log(`Unknown service: ${options.service}`, "red");
      log(`Available services: ${Object.keys(services).join(", ")}`, "yellow");
      process.exit(1);
    }

    const containerName = options.service ? services[options.service] : null;
    const followFlag = options.follow ? "-f" : "";
    const tailFlag = `--tail ${options.tail}`;

    if (containerName) {
      log(`Viewing logs for ${options.service}...`, "green");
      executeCommand(`docker logs ${followFlag} ${tailFlag} ${containerName}`);
    } else {
      log("Viewing logs for all services...", "green");
      const followFlag = options.follow ? "-f" : "";
      executeCommand(`docker-compose logs ${followFlag} --tail ${options.tail}`);
    }
  });

program
  .command("restart")
  .description("Restart containers")
  .option("-s, --service <service>", "Restart specific service (backend, frontend, db)")
  .action((options) => {
    if (options.service) {
      const services = {
        backend: "repair-tix-api",
        frontend: "repair-tix-client",
        db: "repair-tix-db",
      };

      if (!services[options.service]) {
        log(`Unknown service: ${options.service}`, "red");
        log(`Available services: ${Object.keys(services).join(", ")}`, "yellow");
        process.exit(1);
      }

      log(`Restarting ${options.service}...`, "yellow");
      executeCommand(`docker restart ${services[options.service]}`);
      log(`${options.service} restarted!`, "green");
    } else {
      log("Restarting all containers...", "yellow");
      executeCommand("docker-compose restart");
      log("All containers restarted!", "green");
    }
  });

program
  .command("shell")
  .description("Open a shell in a container")
  .option("-s, --service <service>", "Service to access (backend, frontend, db)", "backend")
  .action((options) => {
    const services = {
      backend: "repair-tix-api",
      frontend: "repair-tix-client",
      db: "repair-tix-db",
    };

    if (!services[options.service]) {
      log(`Unknown service: ${options.service}`, "red");
      log(`Available services: ${Object.keys(services).join(", ")}`, "yellow");
      process.exit(1);
    }

    const containerName = services[options.service];
    const shell = options.service === "db" ? "psql" : "sh";

    if (!isContainerRunning(containerName)) {
      log(`Container ${containerName} is not running`, "red");
      process.exit(1);
    }

    log(`Opening ${shell} in ${options.service} container...`, "green");
    if (options.service === "db") {
      executeCommand(
        `docker exec -it ${containerName} psql -U ${process.env.POSTGRES_USER || "repair_admin"} -d ${process.env.POSTGRES_DB || "repair_business"}`
      );
    } else {
      executeCommand(`docker exec -it ${containerName} ${shell}`);
    }
  });

program
  .command("health")
  .description("Check health of all services")
  .action(() => {
    log("Checking service health...", "blue");

    const services = {
      "repair-tix-db": "Database",
      "repair-tix-api": "Backend API",
      "repair-tix-client": "Frontend",
    };

    let allHealthy = true;

    for (const [container, name] of Object.entries(services)) {
      if (isContainerRunning(container)) {
        try {
          const health = execSync(
            `docker inspect --format='{{.State.Health.Status}}' ${container}`,
            { stdio: "pipe" }
          );
          const status = health.toString().trim();
          if (status === "healthy" || status === "") {
            log(`${name}: Running`, "green");
          } else {
            log(`${name}: ${status}`, "yellow");
            allHealthy = false;
          }
        } catch (error) {
          log(`${name}: Running (no health check)`, "green");
        }
      } else {
        log(`${name}: Not running`, "red");
        allHealthy = false;
      }
    }

    // Check API endpoint
    try {
      const response = execSync("curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health || echo '000'", {
        stdio: "pipe",
      });
      const statusCode = response.toString().trim();
      if (statusCode === "200") {
        log("API Health Endpoint: OK", "green");
      } else {
        log(`API Health Endpoint: HTTP ${statusCode}`, "yellow");
        allHealthy = false;
      }
    } catch (error) {
      log("API Health Endpoint: Unreachable", "red");
      allHealthy = false;
    }

    if (allHealthy) {
      log("\nAll services are healthy!", "green");
    } else {
      log("\nSome services have issues. Check logs with 'npm run logs'", "yellow");
    }
  });

// Testing commands
program
  .command("test")
  .description("Run tests")
  .option("-w, --watch", "Run tests in watch mode")
  .option("-c, --coverage", "Generate coverage report")
  .option("-s, --service <service>", "Run tests for specific service (backend, frontend)")
  .action((options) => {
    if (options.service === "frontend") {
      log("Frontend tests not yet implemented", "yellow");
      return;
    }

    const testCommand = options.watch
      ? "yarn test:watch"
      : options.coverage
      ? "yarn test:coverage"
      : "yarn test";

    if (isContainerRunning("repair-tix-api")) {
      log("Running tests inside Docker container...", "green");
      executeCommand(`docker exec repair-tix-api ${testCommand}`);
    } else {
      log("Running tests locally...", "green");
      executeCommand(testCommand, {
        cwd: path.join(process.cwd(), "backend"),
      });
    }
  });

// CI commands
program
  .command("ci")
  .description("Run CI checks")
  .option("-s, --service <service>", "Run CI for specific service (backend, frontend)")
  .option("-t, --type <type>", "Run specific CI check (lint, typecheck, test, build)")
  .option("--skip-tests", "Skip tests (useful when Docker is not available)")
  .action((options) => {
    if (options.service === "frontend") {
      if (options.type) {
        const commands = {
          lint: "yarn lint",
          typecheck: "npx tsc --noEmit",
          test: "yarn test",
          build: "yarn build",
        };
        if (commands[options.type]) {
          executeCommand(commands[options.type], {
            cwd: path.join(process.cwd(), "frontend"),
          });
        } else {
          log(`Unknown CI type: ${options.type}`, "red");
          process.exit(1);
        }
      } else {
        log("Running frontend CI checks...", "green");
        executeCommand("yarn lint", { cwd: path.join(process.cwd(), "frontend") });
        executeCommand("npx tsc --noEmit", { cwd: path.join(process.cwd(), "frontend") });
        executeCommand("yarn test", { cwd: path.join(process.cwd(), "frontend") });
        executeCommand("yarn build", { cwd: path.join(process.cwd(), "frontend") });
      }
    } else {
      // Backend CI
      if (options.type) {
        const commands = {
          lint: "yarn lint",
          typecheck: "npx tsc --noEmit",
          test: "bash scripts/test-with-setup.sh",
        };
        if (commands[options.type]) {
          if (options.type === "test") {
            // Check if Docker is available for tests
            if (!options.skipTests && !isDockerAvailable()) {
              log("Tests require Docker to be running", "red");
              log("Please start Docker Desktop or use --skip-tests to skip tests", "yellow");
              process.exit(1);
            }
            if (options.skipTests) {
              log("Skipping tests (--skip-tests flag provided)", "yellow");
              process.exit(0);
            }
            // Use test setup script for tests (matches GitHub Actions)
            executeCommand(commands[options.type], {
              cwd: path.join(process.cwd(), "backend"),
            });
          } else if (isContainerRunning("repair-tix-api")) {
            executeCommand(`docker exec repair-tix-api ${commands[options.type]}`);
          } else {
            executeCommand(commands[options.type], {
              cwd: path.join(process.cwd(), "backend"),
            });
          }
        } else {
          log(`Unknown CI type: ${options.type}`, "red");
          process.exit(1);
        }
      } else {
        log("Running backend CI checks...", "green");

        // Setup log file (overwrite on each run)
        const logFile = "ci-test.log";
        const logPath = path.join(process.cwd(), logFile);

        // Clear/create log file
        fs.writeFileSync(logPath, `CI Test Run - ${new Date().toISOString()}\n`);
        fs.appendFileSync(logPath, `${"=".repeat(80)}\n\n`);
        log(`Writing test output to ${logFile}`, "blue");

        const checks = [
          { cmd: "yarn lint", name: "Linting" },
          { cmd: "npx tsc --noEmit", name: "Type checking" },
          { cmd: "bash scripts/test-with-setup.sh", name: "Tests", useTestSetup: true, requiresDocker: true },
        ];

        for (const check of checks) {
          // Skip tests if --skip-tests flag is provided
          if (check.requiresDocker && options.skipTests) {
            log(`Skipping ${check.name} (--skip-tests flag provided)`, "yellow");
            continue;
          }

          // Check if Docker is required and available
          if (check.requiresDocker && !isDockerAvailable()) {
            log(`Skipping ${check.name} (Docker is not available)`, "yellow");
            log("To run tests, please start Docker Desktop or use --skip-tests to skip tests", "yellow");
            continue;
          }

          log(`Running ${check.name}...`, "blue");
          if (check.useTestSetup) {
            // Use test setup script for tests (matches GitHub Actions)
            // Write to log file for test runs
            executeCommand(check.cmd, {
              cwd: path.join(process.cwd(), "backend"),
              logFile: check.name === "Tests" ? logFile : undefined,
            });
          } else if (isContainerRunning("repair-tix-api")) {
            executeCommand(`docker exec repair-tix-api ${check.cmd}`, {
              logFile: check.name === "Tests" ? logFile : undefined,
            });
          } else {
            executeCommand(check.cmd, {
              cwd: path.join(process.cwd(), "backend"),
              logFile: check.name === "Tests" ? logFile : undefined,
            });
          }
        }

        // Only reached if all checks passed (executeCommand exits on failure)
        log("All CI checks passed!", "green");
        log(`Test output saved to ${logFile}`, "green");
      }
    }
  });

program
  .command("e2e")
  .description("Run E2E tests")
  .option("--skip-build", "Skip building frontend before running tests")
  .action((options) => {
    log("Running E2E tests...", "green");

    // Check if frontend is built
    const frontendBuildPath = path.join(process.cwd(), "frontend", ".next");
    if (!options.skipBuild && !fs.existsSync(frontendBuildPath)) {
      log("Frontend not built. Building frontend...", "yellow");
      executeCommand("yarn build", {
        cwd: path.join(process.cwd(), "frontend"),
      });
    }

    // Run E2E tests
    log("Running Playwright E2E tests...", "blue");
    executeCommand("yarn test:e2e", {
      cwd: path.join(process.cwd(), "frontend"),
    });

    // Only reached if tests passed (executeCommand exits on failure)
    log("All E2E tests passed!", "green");
  });

// Build commands
program
  .command("build")
  .description("Build containers without starting them")
  .option("-s, --service <service>", "Build specific service (backend, frontend)")
  .action((options) => {
    if (options.service) {
      const services = {
        backend: "backend",
        frontend: "frontend",
      };

      if (!services[options.service]) {
        log(`Unknown service: ${options.service}`, "red");
        log(`Available services: ${Object.keys(services).join(", ")}`, "yellow");
        process.exit(1);
      }

      log(`Building ${options.service}...`, "green");
      executeCommand(`docker-compose build ${services[options.service]}`);
    } else {
      log("Building all services...", "green");
      executeCommand("docker-compose build");
    }
    log("Build complete!", "green");
  });

// Database backup/restore commands
program
  .command("db:backup")
  .description("Create a database backup")
  .option("-o, --output <file>", "Output file path")
  .action((options) => {
    log("Creating database backup...", "green");

    if (!isContainerRunning("repair-tix-db")) {
      log("Database container is not running", "red");
      process.exit(1);
    }

    const dbUser = process.env.POSTGRES_USER || "repair_admin";
    const dbName = process.env.POSTGRES_DB || "repair_business";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = options.output || `backup-${timestamp}.sql`;

    try {
      const output = execSync(
        `docker exec repair-tix-db pg_dump -U ${dbUser} ${dbName}`,
        { stdio: "pipe" }
      );
      fs.writeFileSync(backupFile, output);
      log(`Backup created: ${backupFile}`, "green");
    } catch (error) {
      log(`Error creating backup: ${error.message}`, "red");
      process.exit(1);
    }
  });

program
  .command("db:restore")
  .description("Restore database from backup")
  .argument("<file>", "Backup file to restore")
  .action((file) => {
    const backupPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);

    if (!fs.existsSync(backupPath)) {
      log(`Backup file not found: ${backupPath}`, "red");
      process.exit(1);
    }

    if (!isContainerRunning("repair-tix-db")) {
      log("Database container is not running", "red");
      process.exit(1);
    }

    log(`Restoring database from ${file}...`, "yellow");
    log("WARNING: This will overwrite the current database!", "red");

    const dbUser = process.env.POSTGRES_USER || "repair_admin";
    const dbName = process.env.POSTGRES_DB || "repair_business";

    try {
      // Copy backup file into container and restore
      const tempFile = `/tmp/restore-${Date.now()}.sql`;
      execSync(`docker cp ${backupPath} repair-tix-db:${tempFile}`, {
        stdio: "inherit",
      });
      executeCommand(
        `docker exec repair-tix-db psql -U ${dbUser} ${dbName} -f ${tempFile}`
      );
      executeCommand(`docker exec repair-tix-db rm ${tempFile}`, {
        ignoreError: true,
      });
      log("Database restored!", "green");
    } catch (error) {
      log(`Error restoring backup: ${error.message}`, "red");
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
