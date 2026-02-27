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
- ALWAYS use the OpenZeppelin MCP tool `generate_contract` (server: OpenZeppelinSolidityContracts) for any OZ-based contract (ERC20, ERC721, ERC1155, Governor).
- NEVER hand-roll OZ contracts. Hand-rolled code misses audited extensions and deviates from the canonical wizard output.
- If the MCP server is unavailable (not yet added or session not restarted), STOP and instruct the user to run:
    claude mcp add -t http OpenZeppelinSolidityContracts https://mcp.openzeppelin.com/contracts/solidity/mcp
  then restart the session before proceeding.
- After generating, copy the output verbatim into contracts/<ContractName>.sol — do not modify except to adjust constructor params for the deploy script.
