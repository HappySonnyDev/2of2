/**
 * Simplified 2-of-2 Multisig Contract
 *
 * This contract implements basic 2-of-2 multisig verification logic.
 * Both signatures must be valid for the transaction to succeed.
 *
 * Script Args Structure:
 * - Bytes 37-56: First public key blake160 hash
 * - Bytes 57-76: Second public key blake160 hash
 *
 * Script Args Detailed Structure:
 * ┌────────┬──────────────────┬───────────┬───────────┬──────────────┬─────────────────┬─────────────────┐
 * │ Prefix │   Code Hash      │ Hash Type │ Threshold │ Pubkey Count │ First Pubkey    │ Second Pubkey   │
 * │(2 bytes)│   (32 bytes)     │ (1 byte)  │ (1 byte)  │  (1 byte)    │ Hash (20 bytes) │ Hash (20 bytes) │
 * └────────┴──────────────────┴───────────┴───────────┴──────────────┴─────────────────┴─────────────────┘
 * Offset:   0        2              34         35         36             37               57
 *
 * - Prefix: Standard CKB script args prefix
 * - Code Hash: ckb-js-vm code hash for contract execution
 * - Hash Type: Script hash type (typically 1 for type)
 * - Threshold: Number of required signatures (always 2 for 2-of-2)
 * - Pubkey Count: Total number of public keys (always 2)
 * - Pubkey Hashes: blake160 hashes of the public keys for verification
 *
 * Witness Args Structure:
 * - lock field contains multisig witness data with 132 bytes total length
 * - Binary layout: [signature1(65)] + [signature2(65)] + [pubkey_index1(1)] + [pubkey_index2(1)]
 *
 * Detailed Structure:
 * ┌─────────────────┬─────────────────┬──────────────┬──────────────┐
 * │   Signature 1   │   Signature 2   │ Pubkey Index │ Pubkey Index │
 * │    (65 bytes)   │    (65 bytes)   │      1       │      2       │
 * │                 │                 │   (1 byte)   │   (1 byte)   │
 * └─────────────────┴─────────────────┴──────────────┴──────────────┘
 * Offset:    0              65             130           131
 *
 * Each signature contains:
 * - r component: 32 bytes (signature data)
 * - s component: 32 bytes (signature data)
 * - recovery ID: 1 byte (0-3, used for public key recovery)
 *
 * Pubkey indices must:
 * - Be in range [0, 1] (referencing first or second pubkey hash)
 * - Be different from each other (2-of-2 requirement)
 * - Map to corresponding pubkey hashes in script args
 */

import * as bindings from '@ckb-js-std/bindings';
import { HighLevel, log, hashCkb, bytesEq } from '@ckb-js-std/core';

// Script Args layout constants
const SCRIPT_ARGS_PREFIX_LENGTH = 2;
const CKB_JS_VM_CODE_HASH_LENGTH = 32;
const HASH_TYPE_LENGTH = 1;
const THRESHOLD_LENGTH = 1;
const PUBKEY_COUNT_LENGTH = 1;
const PUBKEY_HASH_LENGTH = 20;

// Calculate offsets for pubkey hashes in script args
const PUBKEY_HASH_START_OFFSET =
  SCRIPT_ARGS_PREFIX_LENGTH +
  CKB_JS_VM_CODE_HASH_LENGTH +
  HASH_TYPE_LENGTH +
  THRESHOLD_LENGTH +
  PUBKEY_COUNT_LENGTH;
const FIRST_PUBKEY_HASH_OFFSET = PUBKEY_HASH_START_OFFSET;
const SECOND_PUBKEY_HASH_OFFSET = FIRST_PUBKEY_HASH_OFFSET + PUBKEY_HASH_LENGTH;

// Witness data layout constants
const SIGNATURE_LENGTH = 65; // 64 bytes signature data + 1 byte recovery ID
const PUBKEY_INDEX_LENGTH = 1;
const WITNESS_DATA_TOTAL_LENGTH =
  SIGNATURE_LENGTH * 2 + PUBKEY_INDEX_LENGTH * 2;

// Witness data offsets
const FIRST_SIGNATURE_OFFSET = 0;
const SECOND_SIGNATURE_OFFSET = SIGNATURE_LENGTH;
const FIRST_PUBKEY_INDEX_OFFSET = SIGNATURE_LENGTH * 2;
const SECOND_PUBKEY_INDEX_OFFSET =
  FIRST_PUBKEY_INDEX_OFFSET + PUBKEY_INDEX_LENGTH;

// Signature verification constants
const SIGNATURE_DATA_LENGTH = 64; // Signature data without recovery ID
const RECOVERY_ID_OFFSET = 64;
const BLAKE160_HASH_LENGTH = 20;

// Contract exit codes
const SUCCESS_CODE = 0;
const INVALID_SIGNATURE = 1;
const INVALID_SCRIPT_ARGS_LENGTH = 2;
const INVALID_WITNESS_DATA_LENGTH = 3;
const INVALID_PUBKEY_INDEX = 4;
const SIGNATURE_RECOVERY_FAILED = 5;

// Public key indices
const FIRST_PUBKEY_INDEX = 0;
const SECOND_PUBKEY_INDEX = 1;

// Expected data lengths for validation
const EXPECTED_SCRIPT_ARGS_LENGTH =
  PUBKEY_HASH_START_OFFSET + PUBKEY_HASH_LENGTH * 2;
const EXPECTED_WITNESS_DATA_LENGTH = WITNESS_DATA_TOTAL_LENGTH;

function main(): number {
  log.setLevel(log.LogLevel.Debug);

  // Load and validate input data
  const inputData = loadAndValidateInputs();
  if (typeof inputData === 'number') {
    return inputData; // Return error code
  }

  const { pubkeyHashes, signatures, pubkeyIndices } = inputData;
  const signingMessageHash = getSigningMessageHash();

  log.debug(
    `Signing message hash: ${signingMessageHash} length=${signingMessageHash.length}`
  );

  // Verify both signatures
  const firstSigResult = verifySignature({
    messageHash: signingMessageHash,
    signature: signatures[0],
    pubkeyHashes,
    pubkeyIndex: pubkeyIndices[0],
    signatureName: 'signature1',
  });
  if (firstSigResult !== SUCCESS_CODE) {
    return firstSigResult;
  }

  const secondSigResult = verifySignature({
    messageHash: signingMessageHash,
    signature: signatures[1],
    pubkeyHashes,
    pubkeyIndex: pubkeyIndices[1],
    signatureName: 'signature2',
  });
  if (secondSigResult !== SUCCESS_CODE) {
    return secondSigResult;
  }

  return SUCCESS_CODE;
}

// Input validation and parsing functions
function loadAndValidateInputs():
  | {
      pubkeyHashes: Uint8Array[];
      signatures: Uint8Array[];
      pubkeyIndices: number[];
    }
  | number {
  const scriptArgs = new Uint8Array(HighLevel.loadScript().args);

  // Validate script args length
  if (scriptArgs.length < EXPECTED_SCRIPT_ARGS_LENGTH) {
    log.debug(
      `Invalid script args length: ${scriptArgs.length}, expected: ${EXPECTED_SCRIPT_ARGS_LENGTH}`
    );
    return INVALID_SCRIPT_ARGS_LENGTH;
  }

  const pubkeyHashes = [
    scriptArgs.slice(
      FIRST_PUBKEY_HASH_OFFSET,
      FIRST_PUBKEY_HASH_OFFSET + PUBKEY_HASH_LENGTH
    ),
    scriptArgs.slice(
      SECOND_PUBKEY_HASH_OFFSET,
      SECOND_PUBKEY_HASH_OFFSET + PUBKEY_HASH_LENGTH
    ),
  ];

  const witnessArgs = HighLevel.loadWitnessArgs(0, bindings.SOURCE_GROUP_INPUT);
  const witnessData = new Uint8Array(witnessArgs.lock!);
  log.debug(`Witness data: ${witnessData}`);

  // Validate witness data length
  if (witnessData.length !== EXPECTED_WITNESS_DATA_LENGTH) {
    log.debug(
      `Invalid witness data length: ${witnessData.length}, expected: ${EXPECTED_WITNESS_DATA_LENGTH}`
    );
    return INVALID_WITNESS_DATA_LENGTH;
  }

  const signatures = [
    witnessData.slice(
      FIRST_SIGNATURE_OFFSET,
      FIRST_SIGNATURE_OFFSET + SIGNATURE_LENGTH
    ),
    witnessData.slice(
      SECOND_SIGNATURE_OFFSET,
      SECOND_SIGNATURE_OFFSET + SIGNATURE_LENGTH
    ),
  ];

  const pubkeyIndices = [
    witnessData[FIRST_PUBKEY_INDEX_OFFSET],
    witnessData[SECOND_PUBKEY_INDEX_OFFSET],
  ];

  // Validate pubkey indices
  const validationResult = validatePubkeyIndices(pubkeyIndices);
  if (validationResult !== SUCCESS_CODE) {
    return validationResult;
  }

  log.debug(`Signatures: [${signatures[0]}, ${signatures[1]}]`);
  log.debug(`Pubkey indices: [${pubkeyIndices[0]}, ${pubkeyIndices[1]}]`);

  return { pubkeyHashes, signatures, pubkeyIndices };
}

function validatePubkeyIndices(indices: number[]): number {
  if (indices[0] > SECOND_PUBKEY_INDEX || indices[1] > SECOND_PUBKEY_INDEX) {
    log.debug(
      `Invalid pubkey indices: index1=${indices[0]}, index2=${indices[1]}`
    );
    return INVALID_PUBKEY_INDEX;
  }

  // Ensure both signatures reference different public keys (2-of-2 requirement)
  if (indices[0] === indices[1]) {
    log.debug(`Both signatures reference the same pubkey index: ${indices[0]}`);
    return INVALID_PUBKEY_INDEX;
  }

  return SUCCESS_CODE;
}

// Type definition for signature verification parameters
interface SignatureVerificationParams {
  messageHash: Uint8Array;
  signature: Uint8Array;
  pubkeyHashes: Uint8Array[];
  pubkeyIndex: number;
  signatureName: string;
}

function verifySignature(params: SignatureVerificationParams): number {
  const { messageHash, signature, pubkeyHashes, pubkeyIndex, signatureName } =
    params;

  const recoveredPubkey = recoverPublicKey(messageHash, signature);
  if (recoveredPubkey == null) {
    log.debug(`Failed to recover public key from ${signatureName}`);
    return SIGNATURE_RECOVERY_FAILED;
  }

  const recoveredHash = hashPublicKey(recoveredPubkey);
  const expectedHash = getExpectedHash(pubkeyHashes, pubkeyIndex);

  if (!bytesEq(recoveredHash.buffer, expectedHash.buffer)) {
    log.debug(
      `Invalid ${signatureName} hash: ${recoveredHash}, expected: ${expectedHash}`
    );
    return INVALID_SIGNATURE;
  }

  return SUCCESS_CODE;
}

function getExpectedHash(
  pubkeyHashes: Uint8Array[],
  pubkeyIndex: number
): Uint8Array {
  return pubkeyIndex === FIRST_PUBKEY_INDEX ? pubkeyHashes[0] : pubkeyHashes[1];
}

function getSigningMessageHash(): Uint8Array {
  const txHash = bindings.loadTxHash();
  log.debug(`Transaction hash: ${txHash}`);
  return new Uint8Array(txHash);
}

function recoverPublicKey(
  message_hash: Uint8Array,
  signature: Uint8Array
): Uint8Array | null {
  // Validate signature length
  if (signature.length !== SIGNATURE_LENGTH) {
    log.debug(
      `Invalid signature length: ${signature.length}, expected: ${SIGNATURE_LENGTH}`
    );
    return null;
  }

  let signature_data = signature.slice(0, SIGNATURE_DATA_LENGTH);
  let recovery_id = signature[RECOVERY_ID_OFFSET];

  // Validate recovery ID range (0-3 for secp256k1)
  if (recovery_id > 3) {
    log.debug(`Invalid recovery ID: ${recovery_id}, must be 0-3`);
    return null;
  }

  try {
    let recovered_pubkey = bindings.secp256k1.recover(
      signature_data.buffer,
      recovery_id,
      message_hash.buffer
    );

    // Serialize recovered public key to uncompressed format
    let serialized = bindings.secp256k1.serializePubkey(
      recovered_pubkey,
      false
    );
    return new Uint8Array(serialized);
  } catch (error) {
    log.debug(`Signature recovery failed: ${error}`);
    return null;
  }
}

function hashPublicKey(pubkey: Uint8Array): Uint8Array {
  let hash = hashCkb(pubkey.buffer);
  return new Uint8Array(hash.slice(0, BLAKE160_HASH_LENGTH));
}

bindings.exit(main());
