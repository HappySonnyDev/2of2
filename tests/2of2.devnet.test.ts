import { hexFrom, ccc, hashTypeToBytes, WitnessArgs } from '@ckb-ccc/core';
import scripts from '../deployment/scripts.json';
import systemScripts from '../deployment/system-scripts.json';
import {
  buildClient,
  buildSigner,
  derivePublicKeyHash,
  generateCkbSecp256k1Signature,
} from './helper';

const TEST_PRIVATE_KEY_1 =
  '0x63d86723e08f0f813a36ce6aa123bb2289d90680ae1e99d4de8cdb334553f24f';
const TEST_PRIVATE_KEY_2 =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

describe('2of2 contract on devnet', () => {
  let client: ccc.Client;
  let signer: ccc.SignerCkbPrivateKey;

  beforeAll(() => {
    // Create global devnet client and signer for all tests in this describe block
    client = buildClient('devnet');
    signer = buildSigner(client);
  });

  test('should execute successfully with valid signatures', async () => {
    const ckbJsVmScript = systemScripts.devnet['ckb_js_vm'];
    const contractScript = scripts.devnet['2of2.bc'];

    // Generate public key hashes for the 2-of-2 multisig
    const pubkeyHash1 = derivePublicKeyHash(TEST_PRIVATE_KEY_1);
    const pubkeyHash2 = derivePublicKeyHash(TEST_PRIVATE_KEY_2);

    // Create script args: [threshold(1)] + [pubkey_count(1)] + [pubkey_hash1(20)] + [pubkey_hash2(20)]
    const scriptArgs = new Uint8Array(42);
    scriptArgs[0] = 2; // threshold (compatibility)
    scriptArgs[1] = 2; // number of pubkeys (compatibility)
    scriptArgs.set(pubkeyHash1, 2);
    scriptArgs.set(pubkeyHash2, 22);

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        '0x0000' +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          hexFrom(scriptArgs).slice(2)
      ),
    };

    // Create the first transaction to establish the UTXO with 2of2 lock
    const tx = ccc.Transaction.from({
      outputs: [
        {
          lock: mainScript,
        },
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer, 1000);
    const txHash = await signer.sendTransaction(tx);
    console.log(`First transaction sent: ${txHash}`);

    // Create the second transaction to consume the 2of2 locked cell
    const secondTx = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash,
            index: 0,
          },
        },
      ],
      outputs: [{ lock: mainScript }],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
      ],
    });

    // mock witneses
    secondTx.witnesses.push('0xfff');

    await secondTx.completeFeeBy(signer, 1500);
    // Get the signing message hash (transaction hash in this case)
    const secondTxHash = secondTx.hash();
    const messageHash = new Uint8Array(32);
    const hashStr = secondTxHash.slice(2); // remove 0x prefix
    for (let i = 0; i < 32; i++) {
      messageHash[i] = parseInt(hashStr.substr(i * 2, 2), 16);
    }

    // Generate signatures for both private keys
    const signature1 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_1,
      messageHash
    );
    const signature2 = generateCkbSecp256k1Signature(
      TEST_PRIVATE_KEY_2,
      messageHash
    );

    // Create witness data: [signature1(65)] + [signature2(65)] + [pubkey_index1(1)] + [pubkey_index2(1)]
    const witnessData = new Uint8Array(132);
    witnessData.set(signature1, 0);
    witnessData.set(signature2, 65);
    witnessData[130] = 0; // first pubkey index
    witnessData[131] = 1; // second pubkey index
    //  overwrite the first witness with the new witness data
    secondTx.witnesses[0] = hexFrom(
      new WitnessArgs(hexFrom(witnessData)).toBytes()
    );
    const finalTxHash = await signer.sendTransaction(secondTx);
    console.log(`Second transaction (2of2 unlock) sent: ${finalTxHash}`);
    console.log('✅ 2of2 contract executed successfully on devnet!');
  });
});
