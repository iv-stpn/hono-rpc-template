// Snowflake ID generator for distributed unique ID generation.
// Format: 64-bit integer (returned as string for JavaScript safety)
// - 41 bits: timestamp in milliseconds since custom epoch
// - 10 bits: worker/machine ID
// - 12 bits: sequence number

// Custom epoch: January 1, 2024 00:00:00 UTC
const EPOCH = 1704067200000n;

// Bit lengths
const WORKER_ID_BITS = 10n;
const SEQUENCE_BITS = 12n;

// Max values
const MAX_WORKER_ID = (1n << WORKER_ID_BITS) - 1n; // 1023
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n; // 4095

// Bit shifts
const WORKER_ID_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS;

/**
 * Generate a Snowflake ID.
 *
 * In a stateless environment like Cloudflare Workers, we use a hybrid approach:
 * - Worker ID is derived from a hash of the request context or randomly assigned
 * - Sequence is randomized to avoid collisions across instances
 *
 * @param workerId Optional worker ID (0-1023). If not provided, one is generated.
 * @returns Snowflake ID as a string
 */
export function generateSnowflake(workerId?: number): string {
  const now = BigInt(Date.now());
  const timestamp = now - EPOCH;

  // Validate timestamp isn't negative (clock skew or before epoch)
  if (timestamp < 0n) {
    throw new Error("Clock moved backwards or timestamp before epoch");
  }

  // Generate or validate worker ID
  let workerIdBigInt: bigint;
  if (workerId !== undefined) {
    if (workerId < 0 || workerId > Number(MAX_WORKER_ID)) {
      throw new Error(`Worker ID must be between 0 and ${MAX_WORKER_ID}`);
    }
    workerIdBigInt = BigInt(workerId);
  } else {
    // In stateless environments, generate a random worker ID
    const randomBytes = crypto.getRandomValues(new Uint8Array(2));
    workerIdBigInt = BigInt((randomBytes[0] << 8) | randomBytes[1]) & MAX_WORKER_ID;
  }

  // Generate random sequence number to avoid collisions in distributed stateless environment
  const sequenceBytes = crypto.getRandomValues(new Uint8Array(2));
  const sequence = BigInt((sequenceBytes[0] << 8) | sequenceBytes[1]) & MAX_SEQUENCE;

  // Combine parts: timestamp | workerId | sequence
  const snowflake = (timestamp << TIMESTAMP_SHIFT) | (workerIdBigInt << WORKER_ID_SHIFT) | sequence;

  return snowflake.toString();
}

/**
 * Parse a Snowflake ID into its component parts.
 * Useful for debugging or extracting timestamp information.
 */
export function parseSnowflake(snowflakeId: string): {
  timestamp: bigint;
  workerId: bigint;
  sequence: bigint;
  date: Date;
} {
  const id = BigInt(snowflakeId);

  const timestamp = id >> TIMESTAMP_SHIFT;
  const workerId = (id >> WORKER_ID_SHIFT) & MAX_WORKER_ID;
  const sequence = id & MAX_SEQUENCE;

  const milliseconds = Number(timestamp + EPOCH);
  const date = new Date(milliseconds);

  return {
    timestamp,
    workerId,
    sequence,
    date,
  };
}

/**
 * Get the timestamp from a Snowflake ID without full parsing.
 */
export function getSnowflakeTimestamp(snowflakeId: string): Date {
  const id = BigInt(snowflakeId);
  const timestamp = id >> TIMESTAMP_SHIFT;
  return new Date(Number(timestamp + EPOCH));
}
