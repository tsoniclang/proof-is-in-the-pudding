import { createSourceSemanticsVirtualModuleProvider } from "@tsonic/source-core/extension";

export function createTsonicPlugin() {
  const targetId = "csharp";
  const addressWidth = 64;
  const providerId = "@proof/csharp-memory-abi";
  const moduleSpecifier = "test:abi";
  const provider = createSourceSemanticsVirtualModuleProvider({
    id: providerId, version: "1", displayName: "Memory ABI proof", virtualDirectory: "memory-abi-proof",
    modules: [{ moduleSpecifier, exports: [] }], evidenceMessage: "Exact registered ABI proof token",
    importsForModule: () => [{ moduleSpecifier: "@tsonic/core/types.js",
      namedImports: [{ exportedName: "DataLayout", kind: "type" }], typeOnly: true }],
    exportsForModule: () => [{ id: "abi.token", name: "abi", kind: "value",
      type: { kind: "provider-ref", moduleSpecifier: "@tsonic/core/types.js", exportName: "DataLayout" } }],
  });
  return {
    kind: "target-capability", id: providerId, targetId, displayName: "Memory ABI proof",
    moduleOwnership: [{ specifierPrefix: moduleSpecifier, providerId }],
    sourceCompilerContributions() {
      return {
        dataLayouts: [{
          providerDeclaration: { providerId, providerVersion: "1", providerModuleId: moduleSpecifier,
            moduleSpecifier, exportId: "abi.token" },
          descriptor: { fingerprint: `proof-le${addressWidth}-v1`, byteOrder: "little", addressWidth },
        }],
        extensions: [{ identity: { id: providerId, version: "1" },
          initialize(context) { context.registerSourceDeclarationProvider(provider); } }],
      };
    },
  };
}
