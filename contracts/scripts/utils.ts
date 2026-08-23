import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { json, } from "starknet";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, "../target/dev");

export function loadClass(name: string) {
  const sierraPath = path.join(
    TARGET_DIR,
    `supersafe_${name}.contract_class.json`,
  );
  const casmPath = path.join(
    TARGET_DIR,
    `supersafe_${name}.compiled_contract_class.json`,
  );
  for (const p of [sierraPath, casmPath]) {
    if (!fs.existsSync(p)) {
      throw new Error(
        `Missing artifact ${path.basename(p)}. Run 'just build-contracts' first.`,
      );
    }
  }
  return {
    contract: json.parse(fs.readFileSync(sierraPath).toString("ascii")),
    casm: json.parse(fs.readFileSync(casmPath).toString("ascii")),
  };
}
