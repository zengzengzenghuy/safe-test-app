import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Spinner, Heading, SegmentedControl } from "evergreen-ui";
import SafeAppsSDK, { SafeInfo } from "@gnosis.pm/safe-apps-sdk";
import { AppTabs } from "./types";
import Main from "./tabs/Main";
import RpcCalls from "./tabs/RpcCalls";
import {
  Modal,
  MenuItem,
  TextField,
  Menu,
  Select,
  FormControlLabel,
  InputLabel,
  Box,
  Typography,
  Switch,
} from "@material-ui/core";
import { Button, SelectChangeEvent } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import Tooltip from "@mui/material/Tooltip";
import {
  AddressInput,
  Divider,
  Text,
  Title,
} from "@gnosis.pm/safe-react-components";
import { ContractInterface, ContractMethod } from "./typing/models";
import FormGroup from "@material-ui/core";
import InterfaceRepository, { InterfaceRepo } from "./libs/interfaceRepository";
import { Signer, ethers } from "ethers";
import { CopyToClipboard } from "react-copy-to-clipboard";
import YahoABI from "./contract/abi/Yaho.json";
import HashiABI from "./contract/abi/HashiModule.json";
import deployedContract from "./utils/contract.json";

const Container = styled.div`
  padding: 24px;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 480px;

  display: grid;
  grid-template-columns: 1fr;
  grid-column-gap: 1rem;
  grid-row-gap: 1rem;
`;



const SDK = new SafeAppsSDK();

const CreateTransaction = (): React.ReactElement => {
  const [safeInfo, setSafeInfo] = useState<SafeInfo | undefined>();
  const [sourceChain, setSourceChain] = useState<any>();
  const [chain, setChain] = useState<string>("");
  const [crossChainId, setcrossChainId] = useState<string>("");
  const [hashiModuleAddr, setHashiModuleAddr] = useState<string>("");
  const [crossChainSafe, setCrossChainSafe] = useState<string>("");
  const [contractAddr, setcontractAddr] = useState<string>("");
  const [abi, setAbi] = useState<string>("");
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [param, setParam] = useState<string>();
  const [isInput, setIsInput] = useState<boolean>(false);
  const interfaceRepo = new InterfaceRepository();
  const [contract, setContract] = useState<ContractInterface | null>(null);
  const [functionIndex, setFunctionIndex] = useState<any>();
  const [bridge, setBridge] = useState<string>("");
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<Object>();

  const [copyToClipboard, setCopyToClipboard] = useState<boolean>(false);

  useEffect(() => {
    async function loadSafeInfo() {
      const safuInfo = await SDK.safe.getInfo();
      const chainInfo = await SDK.safe.getChainInfo();
      setSourceChain(chainInfo);
      console.log({ safuInfo, chainInfo });
      setSafeInfo(safuInfo);
    }
    loadSafeInfo();
  }, []);

  useEffect(() => {
    console.log("Use effect triggered");
    contract?.methods.map((option, index) => {
      if (option.name == selectedFunction) {
        setFunctionIndex(index);
        setIsInput(Object.keys(option.inputs).length != 0 ? true : false);
      }
      setParam("");
    });
    console.log("Selected function", selectedFunction);
  }, [selectedFunction]);

  useEffect(() => {}, [bridge]);

  const [binaryData, setBinaryData] = useState<ArrayBuffer>();
  const fetchData = async () => {
    try {
      const response = await fetch("/src/contract/HashiModuleBytecode.bin");
      const data = await response.arrayBuffer();
      setBinaryData(data);
    } catch (error) {
      console.error("Error fetching binary file:", error);
    }
  };

  const handleClick = () => {
    console.log("ABI: ", abi);
    console.log("type ", typeof abi);
    const method: ContractInterface = interfaceRepo.getMethods(abi);
    setContract(method);
    console.log("method ", method.methods);
  };

  const createTxClick = async () => {
    setIsDetailOpen(true);
    const params: string[] | undefined = param?.split(",");
    const iface = new ethers.utils.Interface(abi);
    const toAddr = contractAddr;
    const func = selectedFunction;
    console.log(typeof params);
    let calldata;
    if (params?.length == 1 && params[0] == "") {
      console.log("null");

      calldata = iface.encodeFunctionData(func);
    } else {
      calldata = iface.encodeFunctionData(func, params);
    }

    console.log("calldata: ", calldata);

    const hashiModuleiFace = new ethers.utils.Interface(HashiABI);
    const txData = hashiModuleiFace.encodeFunctionData("executeTransaction", [
      toAddr,
      0,
      calldata,
      0,
    ]);

    const message = {
      to: hashiModuleAddr,
      toChainId: Number(crossChainId),
      data: txData,
    };
    setMessage(message);
    console.log("Message:", message);
    console.log("JSON STRING: ", JSON.stringify(message));
  };
  const confirmTx = async () => {
    console.log("Param split", param?.split(","));
    const params: string[] | undefined = param?.split(",");
    const iface = new ethers.utils.Interface(abi);
    const toAddr = contractAddr;
    const func = selectedFunction;
    console.log(typeof params);
    let calldata;
    if (params?.length == 1 && params[0] == "") {
      console.log("null");

      calldata = iface.encodeFunctionData(func);
    } else {
      calldata = iface.encodeFunctionData(func, params);
    }

    console.log("calldata: ", calldata);

    const hashiModuleiFace = new ethers.utils.Interface(HashiABI);
    const txData = hashiModuleiFace.encodeFunctionData("executeTransaction", [
      toAddr,
      0,
      calldata,
      0,
    ]);

    const message = {
      to: hashiModuleAddr,
      toChainId: Number(crossChainId),
      data: txData,
    };
    setMessage(message);

    const Yaho = new ethers.utils.Interface(YahoABI);
    // only testing with AMB at the moment
    console.log(
      typeof deployedContract.GoerAMBMessageRelay +
        deployedContract.GoerAMBMessageRelay
    );
    console.log(
      typeof deployedContract.GCAMBAdapter + deployedContract.GCAMBAdapter
    );
    console.log(typeof message + message);
    const SafeTxData = Yaho.encodeFunctionData("dispatchMessagesToAdapters", [
      [message],
      [deployedContract.GoerAMBMessageRelay],
      [deployedContract.GCAMBAdapter],
    ]);

    console.log("Create tx");

    const safeTxHash = await SDK.txs.send({
      txs: [
        {
          to: deployedContract.Yaho,
          value: "0",
          data: SafeTxData,
        },
      ],
    });
    console.log("Tx hash: ", safeTxHash);
  };

  const Boxstyle = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };
  if (!safeInfo) {
    return <Spinner size={24} />;
  }

  return (
    <Container>
      <Typography variant="h4">Safe details</Typography>
      <Typography variant="h6">
        From {sourceChain.chainName}: {safeInfo.safeAddress}
      </Typography>
      <InputLabel>To</InputLabel>
      <div style={{ display: "flex" }}>
        <Select
          variant="outlined"
          label="Select Chain"
          value={chain}
          onChange={(event: React.ChangeEvent<{ value: unknown }>) => {
            setChain(event.target.value as string);
            event.target.value == "Gnosis Chain"
              ? setcrossChainId("100")
              : setcrossChainId("1");
          }}
        >
          <MenuItem value="Ethereum">Ethereum</MenuItem>
          <MenuItem value="Gnosis Chain">Gnosis Chain</MenuItem>
        </Select>
        <Tooltip title="Chain to call to">
          <HelpIcon />
        </Tooltip>
      </div>
      <div style={{ display: "flex" }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Cross Chain Safe"
          value={crossChainSafe}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCrossChainSafe(event.target.value);
          }}
        />
        <Tooltip title="Safe address on destination chain">
          <HelpIcon />
        </Tooltip>
      </div>

      <div style={{ display: "flex" }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Hashi Module"
          value={hashiModuleAddr}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setHashiModuleAddr(event.target.value);
          }}
        />
        <Tooltip title="Hashi Module of Safe on destination chain. Each Safe should have one Hashi module for one source chain">
          <HelpIcon />
        </Tooltip>
      </div>

      <InputLabel>Select Bridge Solution</InputLabel>
      <div style={{ display: "flex" }}>
        <Select
          variant="outlined"
          label="Select Bridge"
          value={bridge}
          onChange={(event: React.ChangeEvent<{ value: unknown }>) => {
            setBridge(event.target.value as string);
          }}
        >
          <MenuItem value="AMB">AMB</MenuItem>
          <MenuItem value="Telepathy">Telepathy</MenuItem>
          <MenuItem value="Connext">Connext</MenuItem>
          <MenuItem value="DendrETH">DendrETH</MenuItem>
          <MenuItem value="Sygma">Sygma</MenuItem>
          <MenuItem disabled={true} value="Wormhole">
            Wormhole
          </MenuItem>
          <MenuItem disabled={true} value="Axiom">
            Axiom
          </MenuItem>
        </Select>
        <Tooltip title="Bridge solution to relay the message">
          <HelpIcon />
        </Tooltip>
      </div>

      <Typography variant="h4">Transaction details</Typography>

      <div style={{ display: "flex" }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Enter Cross Chain Contract Address"
          value={contractAddr}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setcontractAddr(event.target.value);
          }}
        />
        <Tooltip title="Contract address to call on destination chain">
          <HelpIcon />
        </Tooltip>
      </div>
      <div style={{ display: "flex" }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Enter ABI"
          value={abi}
          onChange={(e) => setAbi(e.target.value)}
        />
        <Tooltip
          title={
            <>
              <Typography>Format</Typography>
              <p>
                &#91;&#123;"type": "function", "inputs": [&#123;
                "name":"a","type":"uint256"&#125;], "name":"foo", "outputs":
                []&#125; &#93;
              </p>
            </>
          }
        >
          <HelpIcon />
        </Tooltip>
      </div>
      {abi && (
        <Button variant="contained" onClick={handleClick}>
          Filter ABI
        </Button>
      )}
      {contract && (
        <TextField fullWidth select variant="outlined" label="Select Function">
          {contract?.methods.map((option) => (
            <MenuItem
              key={option.name}
              value={option.name}
              onClick={() => {
                console.log("click: ", option.name);
                setSelectedFunction(option.name);
              }}
            >
              {option.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {selectedFunction && isInput && (
        <TextField
          fullWidth
          variant="outlined"
          label="Parameter"
          onChange={(e) => {
            setParam(e.target.value);
          }}
        ></TextField>
      )}

      <Button variant="contained" onClick={createTxClick}>
        Create Transaction
      </Button>
      <Modal
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
        }}
      >
        <Box sx={Boxstyle}>
          <Typography>
            From {sourceChain.chainName} to {chain}
            <br />
            Choose {bridge} <br />
            Calling function: {selectedFunction} <br />
            wih parameter: {param} <br />
            Called by Safe address: {crossChainSafe} <br />
            <CopyToClipboard
              text={JSON.stringify(message)}
              onCopy={() => setCopyToClipboard(true)}
            >
              <Button
                variant="contained"
                color="primary"
                
              >
                Click to Copy Message
              </Button>
            </CopyToClipboard>
            <br />
            <Button variant="contained" onClick={confirmTx}>
              Confirm Transaction
            </Button>
          </Typography>
        </Box>
      </Modal>
    </Container>
  );
};

export default CreateTransaction;
