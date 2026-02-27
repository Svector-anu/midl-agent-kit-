# Middleware Interfaces (v1)

## validateInputs
- validateContractAddress(addr): reads state + validates 0x address format.
- validateNetwork(): confirms capabilities.network.default and rpc are set.
- validateToolchain(): confirms hardhat + viemOverride + evmVersion=paris.

## stateAccess
- readState(file): only from state/*.json
- writeState(file, patch): only to state/deployment-log.json, state/verified-addresses.json, state/erc-compatibility.json

## pauseIfUnsupported(feature)
- if capabilities.features[feature] !== true → STOP and ask human.

## contractGeneration
- RECOMMENDED: use the OpenZeppelin MCP tool `generate_contract` (server: OpenZeppelinSolidityContracts) for any OZ-based contract (ERC20, ERC721, ERC1155, Governor). Wizard output is audited and canonical.
- If the MCP is available, prefer it over hand-rolling. After generating, copy the output verbatim into contracts/<ContractName>.sol.
- If the MCP is unavailable, hand-rolling is acceptable — follow OZ patterns closely and note it was not wizard-generated.
