#!/bin/bash
# Orchestrate complete backend test flow with database setup and teardown
# Matches GitHub Actions workflow exactly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Store test exit code in a way that survives trap
# This will be set after tests run, or remain unset if script fails before tests
TEST_EXIT_CODE=""

# Cleanup function to ensure teardown happens even on failure
cleanup() {
  # Use TEST_EXIT_CODE if set (from test execution), otherwise use $? (from set -e failure)
  local exit_code=${TEST_EXIT_CODE:-$?}
  echo ""
  echo "Cleaning up test database..."
  "${SCRIPT_DIR}/teardown-test-db.sh" || true
  # Exit with the appropriate exit code to propagate failures
  # (Failure messages are already printed by the main script)
  exit $exit_code
}

# Set trap to ensure cleanup happens
trap cleanup EXIT

echo "========================================="
echo "Running Backend Tests with Database Setup"
echo "========================================="
echo ""

# Step 1: Setup test database
echo "Step 1: Setting up test database..."
"${SCRIPT_DIR}/setup-test-db.sh"

# Step 2: Run migrations
echo ""
echo "Step 2: Running database migrations..."
"${SCRIPT_DIR}/run-test-migrations.sh"

# Step 3: Run tests
echo ""
echo "Step 3: Running tests..."
cd "${BACKEND_DIR}"

# Export environment variables to match GitHub Actions exactly
export NODE_ENV=test
export DB_HOST=localhost
export DB_PORT=5433
export DB_USER=test_user
export DB_PASSWORD=test_password
export DB_NAME=test_db
export JWT_SECRET=test_secret_for_ci_only

# Run tests and capture exit code
# Temporarily disable set -e to capture exit code even on failure
set +e
TEST_OUTPUT=$(yarn test 2>&1)
TEST_EXIT_CODE=$?
set -e

# Check Jest output for failures (Jest sometimes exits with 0 even when tests fail)
# Look for patterns like "Test Suites: X failed" or "Tests: X failed"
if echo "$TEST_OUTPUT" | grep -qE "Test Suites:.*[1-9][0-9]* failed" || \
   echo "$TEST_OUTPUT" | grep -qE "Tests:.*[1-9][0-9]* failed"; then
  # Tests failed - set exit code to 1
  TEST_EXIT_CODE=1
  echo "$TEST_OUTPUT"
  echo ""
  echo "========================================="
  echo "Tests failed (detected from output)"
  echo "========================================="
elif [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "$TEST_OUTPUT"
  echo ""
  echo "========================================="
  echo "All tests passed!"
  echo "========================================="
else
  echo "$TEST_OUTPUT"
  echo ""
  echo "========================================="
  echo "Tests failed with exit code $TEST_EXIT_CODE"
  echo "========================================="
fi

# Exit with the test exit code to propagate failures
# The cleanup trap will use TEST_EXIT_CODE variable
exit $TEST_EXIT_CODE

