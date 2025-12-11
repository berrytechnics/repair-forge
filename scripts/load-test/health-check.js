/**
 * Simple load test for health check endpoint
 * Usage: node scripts/load-test/health-check.js [concurrent] [requests]
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const CONCURRENT = parseInt(process.argv[2] || '10', 10);
const TOTAL_REQUESTS = parseInt(process.argv[3] || '100', 10);

const results = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  responseTimes: [],
};

function makeRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(`${API_URL}/health`);

    const req = http.get(url, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      results.total++;
      results.responseTimes.push(responseTime);

      if (res.statusCode === 200) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          statusCode: res.statusCode,
          responseTime,
        });
      }

      resolve();
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      results.total++;
      results.failed++;
      results.errors.push({
        error: error.message,
        responseTime: endTime - startTime,
      });
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      results.total++;
      results.failed++;
      results.errors.push({
        error: 'Timeout',
        responseTime: 5000,
      });
      resolve();
    });
  });
}

async function runLoadTest() {
  console.log(`Starting load test:`);
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Concurrent requests: ${CONCURRENT}`);
  console.log(`  Total requests: ${TOTAL_REQUESTS}`);
  console.log('');

  const startTime = Date.now();
  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(CONCURRENT, TOTAL_REQUESTS - results.total);
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      promises.push(makeRequest());
    }

    await Promise.all(promises);

    // Progress update
    const progress = ((results.total / TOTAL_REQUESTS) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${progress}% (${results.total}/${TOTAL_REQUESTS})`);
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log('\n');
  console.log('Load test completed!');
  console.log('');
  console.log('Results:');
  console.log(`  Total requests: ${results.total}`);
  console.log(`  Successful: ${results.success}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Success rate: ${((results.success / results.total) * 100).toFixed(2)}%`);
  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Requests per second: ${(results.total / (totalTime / 1000)).toFixed(2)}`);
  console.log('');

  if (results.responseTimes.length > 0) {
    const sorted = results.responseTimes.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    console.log('Response Times:');
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  Avg: ${avg.toFixed(2)}ms`);
    console.log(`  p50: ${p50}ms`);
    console.log(`  p95: ${p95}ms`);
    console.log(`  p99: ${p99}ms`);
  }

  if (results.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    results.errors.slice(0, 10).forEach((error, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(error)}`);
    });
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more`);
    }
  }
}

runLoadTest().catch(console.error);
