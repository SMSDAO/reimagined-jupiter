"""
Solana RPC client module using solana-py.

This module provides a high-level interface for interacting with Solana RPC endpoints.
"""

import os
from typing import Optional, Dict, Any, List
from solana.rpc.async_api import AsyncClient
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.transaction import Transaction


class SolanaRPCClient:
    """
    High-level client for interacting with Solana RPC endpoints.
    
    Supports both synchronous and asynchronous operations using solana-py.
    """

    def __init__(self, rpc_url: Optional[str] = None, use_async: bool = False):
        """
        Initialize the Solana RPC client.
        
        Args:
            rpc_url: Solana RPC endpoint URL. If None, loads from SOLANA_RPC_URL env var.
            use_async: Whether to use async client (default: False)
        """
        if rpc_url is None:
            rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
        
        self.rpc_url = rpc_url
        self.use_async = use_async
        
        if use_async:
            self.client = AsyncClient(rpc_url)
        else:
            self.client = Client(rpc_url)

    def get_balance(self, pubkey: Pubkey) -> int:
        """
        Get the SOL balance of an account in lamports.
        
        Args:
            pubkey: Public key of the account
            
        Returns:
            Balance in lamports (1 SOL = 1,000,000,000 lamports)
        """
        response = self.client.get_balance(pubkey)
        return response.value

    async def get_balance_async(self, pubkey: Pubkey) -> int:
        """
        Get the SOL balance of an account in lamports (async).
        
        Args:
            pubkey: Public key of the account
            
        Returns:
            Balance in lamports
        """
        response = await self.client.get_balance(pubkey)
        return response.value

    def get_account_info(self, pubkey: Pubkey) -> Optional[Dict[str, Any]]:
        """
        Get account information for a given public key.
        
        Args:
            pubkey: Public key of the account
            
        Returns:
            Account information dictionary or None if account doesn't exist
        """
        response = self.client.get_account_info(pubkey)
        if response.value is None:
            return None
        
        account = response.value
        return {
            "lamports": account.lamports,
            "owner": str(account.owner),
            "executable": account.executable,
            "rent_epoch": account.rent_epoch,
            "data": account.data,
        }

    async def get_account_info_async(self, pubkey: Pubkey) -> Optional[Dict[str, Any]]:
        """
        Get account information for a given public key (async).
        
        Args:
            pubkey: Public key of the account
            
        Returns:
            Account information dictionary or None if account doesn't exist
        """
        response = await self.client.get_account_info(pubkey)
        if response.value is None:
            return None
        
        account = response.value
        return {
            "lamports": account.lamports,
            "owner": str(account.owner),
            "executable": account.executable,
            "rent_epoch": account.rent_epoch,
            "data": account.data,
        }

    def send_transaction(
        self,
        transaction: Transaction,
        skip_preflight: bool = False,
    ) -> str:
        """
        Send a signed transaction to the blockchain.
        
        Args:
            transaction: Signed transaction to send
            skip_preflight: Whether to skip preflight checks
            
        Returns:
            Transaction signature as string
        """
        response = self.client.send_transaction(
            transaction,
            opts={"skip_preflight": skip_preflight}
        )
        return str(response.value)

    async def send_transaction_async(
        self,
        transaction: Transaction,
        skip_preflight: bool = False,
    ) -> str:
        """
        Send a signed transaction to the blockchain (async).
        
        Args:
            transaction: Signed transaction to send
            skip_preflight: Whether to skip preflight checks
            
        Returns:
            Transaction signature as string
        """
        response = await self.client.send_transaction(
            transaction,
            opts={"skip_preflight": skip_preflight}
        )
        return str(response.value)

    def confirm_transaction(self, signature: Signature, commitment: str = "confirmed") -> bool:
        """
        Confirm a transaction by its signature.
        
        Args:
            signature: Transaction signature
            commitment: Commitment level (finalized, confirmed, processed)
            
        Returns:
            True if transaction is confirmed, False otherwise
        """
        response = self.client.confirm_transaction(signature, commitment=commitment)
        return response.value[0].status is None  # None status means success

    async def confirm_transaction_async(
        self, signature: Signature, commitment: str = "confirmed"
    ) -> bool:
        """
        Confirm a transaction by its signature (async).
        
        Args:
            signature: Transaction signature
            commitment: Commitment level (finalized, confirmed, processed)
            
        Returns:
            True if transaction is confirmed, False otherwise
        """
        response = await self.client.confirm_transaction(signature, commitment=commitment)
        return response.value[0].status is None

    def get_recent_blockhash(self) -> str:
        """
        Get the most recent blockhash.
        
        Returns:
            Recent blockhash as string
        """
        response = self.client.get_latest_blockhash()
        return str(response.value.blockhash)

    async def get_recent_blockhash_async(self) -> str:
        """
        Get the most recent blockhash (async).
        
        Returns:
            Recent blockhash as string
        """
        response = await self.client.get_latest_blockhash()
        return str(response.value.blockhash)

    def get_slot(self) -> int:
        """
        Get the current slot number.
        
        Returns:
            Current slot number
        """
        response = self.client.get_slot()
        return response.value

    async def get_slot_async(self) -> int:
        """
        Get the current slot number (async).
        
        Returns:
            Current slot number
        """
        response = await self.client.get_slot()
        return response.value

    def simulate_transaction(self, transaction: Transaction) -> Dict[str, Any]:
        """
        Simulate a transaction without sending it to the blockchain.
        
        Args:
            transaction: Transaction to simulate
            
        Returns:
            Simulation result dictionary
        """
        response = self.client.simulate_transaction(transaction)
        return {
            "error": response.value.err,
            "logs": response.value.logs,
            "units_consumed": response.value.units_consumed,
        }

    async def simulate_transaction_async(self, transaction: Transaction) -> Dict[str, Any]:
        """
        Simulate a transaction without sending it to the blockchain (async).
        
        Args:
            transaction: Transaction to simulate
            
        Returns:
            Simulation result dictionary
        """
        response = await self.client.simulate_transaction(transaction)
        return {
            "error": response.value.err,
            "logs": response.value.logs,
            "units_consumed": response.value.units_consumed,
        }

    def close(self) -> None:
        """Close the RPC client connection."""
        if hasattr(self.client, 'close'):
            self.client.close()

    async def close_async(self) -> None:
        """Close the RPC client connection (async)."""
        if hasattr(self.client, 'close'):
            await self.client.close()
