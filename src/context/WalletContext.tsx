'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { setAuthContext } from '@/lib/api';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).ethereum as EthereumProvider | undefined;
}

interface WalletState {
  address: string | null;
  signer: JsonRpcSigner | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  shortAddress: string;
}

const WalletContext = createContext<WalletState>({
  address: null,
  signer: null,
  chainId: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  shortAddress: '',
});

export const useWallet = () => useContext(WalletContext);

const MONAD_CHAIN_ID = 143;
const MONAD_RPC = 'https://rpc.monad.xyz';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const switchToMonad = async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MONAD_CHAIN_ID.toString(16)}` }],
      });
    } catch {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${MONAD_CHAIN_ID.toString(16)}`,
          chainName: 'Monad',
          nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
          rpcUrls: [MONAD_RPC],
          blockExplorerUrls: ['https://monadexplorer.com'],
        }],
      });
    }
  };

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    setIsConnecting(true);
    try {
      await ethereum.request({ method: 'eth_requestAccounts' });
      await switchToMonad();
      const provider = new BrowserProvider(ethereum as any);
      const s = await provider.getSigner();
      const addr = await s.getAddress();
      const network = await provider.getNetwork();
      setAddress(addr);
      setSigner(s);
      setChainId(Number(network.chainId));
      setAuthContext(s, addr);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setChainId(null);
    setAuthContext(null, '');
  }, []);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) disconnect();
      else setAddress(accounts[0]);
    };

    const handleChainChanged = () => window.location.reload();

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);
  }, [disconnect]);

  return (
    <WalletContext.Provider value={{ address, signer, chainId, isConnecting, connect, disconnect, shortAddress }}>
      {children}
    </WalletContext.Provider>
  );
}
