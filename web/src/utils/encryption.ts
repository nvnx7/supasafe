import { MAX_VIEWING_KEY } from "@starkware-libs/starknet-privacy-sdk";
import {
  derivePublicKey,
  encryptions,
} from "@starkware-libs/starknet-privacy-sdk/utils";
import { ec, encode } from "starknet";

function randomScalar() {
  return encode.uint8ArrayToBigInt(ec.starkCurve.utils.randomPrivateKey());
}

// An x-only public key cannot distinguish k from n - k, so the pool restricts viewing keys to
// the lower half of the curve order. Folding rather than resampling keeps the draw uniform.
export function generateViewKey() {
  const scalar = randomScalar();
  const privateKey =
    scalar > MAX_VIEWING_KEY ? ec.starkCurve.CURVE.n - scalar : scalar;

  return { privateKey, publicKey: derivePublicKey(privateKey) };
}

export function encryptViewKey(params: {
  viewKey: bigint;
  recipientPublicKey: bigint;
  ephemeralSecret?: bigint;
}) {
  const { ephemeralPubkey, encPrivateKey } = encryptions.encryptPrivateKey(
    params.ephemeralSecret ?? randomScalar(),
    params.recipientPublicKey,
    params.viewKey,
  );

  return { ephemeralPubkey, ciphertext: encPrivateKey };
}

export function decryptViewKey(params: {
  ephemeralPubkey: bigint;
  ciphertext: bigint;
  recipientPrivateKey: bigint;
}) {
  return encryptions.decryptPrivateKey(
    {
      ephemeralPubkey: params.ephemeralPubkey,
      encPrivateKey: params.ciphertext,
    },
    params.recipientPrivateKey,
  );
}
