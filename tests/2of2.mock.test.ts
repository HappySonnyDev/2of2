import { hexFrom, hashTypeToBytes, WitnessArgs } from '@ckb-ccc/core';
import { Verifier } from 'ckb-testtool';
import {
  generateCkbSecp256k1Signature,
  setupContractTransaction,
  setupScriptArgs,
  setupTransactionCells,
  getTransactionMessageHash,
  createWitnessData,
  verifyContractExecution,
} from './helper';

const TEST_PRIVATE_KEY_1 =
  '0x63d86723e08f0f813a36ce6aa123bb2289d90680ae1e99d4de8cdb334553f24f';
const TEST_PRIVATE_KEY_2 =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

describe('2of2 mock', () => {
  test('success', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    );
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    );
    const witnessData = createWitnessData(signature1, signature2);
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 0) {
      throw new Error(
        `Expected contract to return 0 for success, got: ${contractExitCode}`
      );
    }

    console.log('✅ Contract correctly returned exit code 0 for success');
  });

  test('signature 1 validation fails', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    // Use wrong private key for signature 1 to cause validation failure
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    ); // Wrong key
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    ); // Correct key
    const witnessData = createWitnessData(signature1, signature2);
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 1) {
      throw new Error(
        `Expected contract to return 1 for signature validation failure, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 1 for signature 1 validation failure'
    );
  });

  test('signature 2 validation fails', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    // Use wrong private key for signature 2 to cause validation failure
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    ); // Correct key
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    ); // Wrong key
    const witnessData = createWitnessData(signature1, signature2);
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 1) {
      throw new Error(
        `Expected contract to return 1 for signature validation failure, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 1 for signature 2 validation failure'
    );
  });

  test('invalid script args length', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    // Create script args that are too short (missing pubkey hashes)
    const shortArgs = new Uint8Array(30); // Too short, should be at least 57 bytes
    shortArgs[0] = 2; // threshold
    shortArgs[1] = 2; // pubkey count

    mainScript.args = hexFrom(
      '0x0000' +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        hexFrom(shortArgs).slice(2)
    );

    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    );
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    );
    const witnessData = createWitnessData(signature1, signature2);
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 2) {
      throw new Error(
        `Expected contract to return 2 for invalid script args length, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 2 for invalid script args length'
    );
  });

  test('invalid witness data length', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    // Create witness data with wrong length (too short)
    const invalidWitnessData = new Uint8Array(100); // Should be 132 bytes
    tx.witnesses.push(
      hexFrom(new WitnessArgs(hexFrom(invalidWitnessData)).toBytes())
    );

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 3) {
      throw new Error(
        `Expected contract to return 3 for invalid witness data length, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 3 for invalid witness data length'
    );
  });

  test('invalid pubkey indices', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    );
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    );

    // Create witness data with invalid pubkey indices (both pointing to same key)
    const witnessData = createWitnessData(signature1, signature2, 0, 0); // Both indices are 0
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 4) {
      throw new Error(
        `Expected contract to return 4 for invalid pubkey indices, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 4 for invalid pubkey indices'
    );
  });

  test('out of range pubkey indices', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    );
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    );

    // Create witness data with out-of-range pubkey index
    const witnessData = createWitnessData(signature1, signature2, 0, 5); // Index 5 is out of range
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 4) {
      throw new Error(
        `Expected contract to return 4 for out-of-range pubkey index, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 4 for out-of-range pubkey index'
    );
  });

  test('invalid signature recovery ID', async () => {
    const { resource, tx, mainScript, alwaysSuccessScript, contractScript } =
      setupContractTransaction();

    setupScriptArgs(
      mainScript,
      contractScript,
      TEST_PRIVATE_KEY_1,
      TEST_PRIVATE_KEY_2
    );
    setupTransactionCells(tx, mainScript, alwaysSuccessScript, resource);

    const messageHash = getTransactionMessageHash(tx);
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    );
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    );

    // Corrupt the recovery ID in signature1 (set to invalid value > 3)
    const corruptedSignature1 = new Uint8Array(signature1);
    corruptedSignature1[64] = 7; // Invalid recovery ID

    const witnessData = createWitnessData(corruptedSignature1, signature2);
    tx.witnesses.push(hexFrom(new WitnessArgs(hexFrom(witnessData)).toBytes()));

    const verifier = Verifier.from(resource, tx);
    const contractExitCode = verifyContractExecution(verifier);

    if (contractExitCode !== 5) {
      throw new Error(
        `Expected contract to return 5 for signature recovery failure, got: ${contractExitCode}`
      );
    }

    console.log(
      '✅ Contract correctly returned exit code 5 for invalid recovery ID'
    );
  });
});
