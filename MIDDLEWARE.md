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
