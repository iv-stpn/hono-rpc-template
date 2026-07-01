// Wrangler bundles `.wasm` imports as WebAssembly.Module instances at build
// time. Declare the module shape so TypeScript accepts the imports used in
// crypto.ts (argon2-wasm-edge).
declare module "*.wasm" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
