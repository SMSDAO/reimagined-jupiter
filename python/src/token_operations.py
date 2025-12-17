"""
Token operations module using solana-py and solders.

This module provides utilities for SPL token operations including transfers,
account creation, and balance queries.
"""

from typing import Optional, Dict, Any
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import create_account, CreateAccountParams
from solders.sysvar import RENT
from spl.token.constants import TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
from spl.token.instructions import (
    get_associated_token_address,
    create_associated_token_account,
    transfer_checked,
    TransferCheckedParams,
)


class TokenOperations:
    """
    Handles SPL token operations including transfers and account management.
    
    Integrates solana-py and solders for efficient token processing.
    """

    def __init__(self, client: Client):
        """
        Initialize token operations handler.
        
        Args:
            client: Solana RPC client
        """
        self.client = client

    def get_token_account_balance(self, token_account: Pubkey) -> Dict[str, Any]:
        """
        Get the balance of a token account.
        
        Args:
            token_account: Public key of the token account
            
        Returns:
            Dictionary with amount, decimals, and ui_amount
        """
        response = self.client.get_token_account_balance(token_account)
        balance = response.value
        return {
            "amount": balance.amount,
            "decimals": balance.decimals,
            "ui_amount": balance.ui_amount,
            "ui_amount_string": balance.ui_amount_string,
        }

    def get_token_accounts_by_owner(
        self, owner: Pubkey, mint: Optional[Pubkey] = None
    ) -> list:
        """
        Get all token accounts owned by an address.
        
        Args:
            owner: Owner's public key
            mint: Optional token mint to filter by
            
        Returns:
            List of token accounts
        """
        if mint:
            response = self.client.get_token_accounts_by_owner(
                owner,
                {"mint": mint}
            )
        else:
            response = self.client.get_token_accounts_by_owner(
                owner,
                {"programId": TOKEN_PROGRAM_ID}
            )
        
        return response.value

    def get_associated_token_address(
        self, owner: Pubkey, mint: Pubkey
    ) -> Pubkey:
        """
        Get the associated token address for an owner and mint.
        
        Args:
            owner: Owner's public key
            mint: Token mint public key
            
        Returns:
            Associated token account address
        """
        return get_associated_token_address(owner, mint)

    def create_associated_token_account_instruction(
        self,
        payer: Pubkey,
        owner: Pubkey,
        mint: Pubkey
    ) -> Instruction:
        """
        Create instruction to initialize an associated token account.
        
        Args:
            payer: Account that will pay for account creation
            owner: Owner of the new token account
            mint: Token mint
            
        Returns:
            Instruction to create associated token account
        """
        return create_associated_token_account(
            payer=payer,
            owner=owner,
            mint=mint
        )

    def create_token_transfer_instruction(
        self,
        source: Pubkey,
        dest: Pubkey,
        owner: Pubkey,
        amount: int,
        decimals: int,
        mint: Pubkey,
        signers: Optional[list] = None
    ) -> Instruction:
        """
        Create instruction to transfer SPL tokens.
        
        Args:
            source: Source token account
            dest: Destination token account
            owner: Owner of the source account
            amount: Amount to transfer (in token's smallest unit)
            decimals: Token decimals
            mint: Token mint public key
            signers: Optional additional signers
            
        Returns:
            Token transfer instruction
        """
        params = TransferCheckedParams(
            program_id=TOKEN_PROGRAM_ID,
            source=source,
            mint=mint,
            dest=dest,
            owner=owner,
            amount=amount,
            decimals=decimals,
            signers=signers or []
        )
        return transfer_checked(params)

    def get_mint_info(self, mint: Pubkey) -> Dict[str, Any]:
        """
        Get information about a token mint.
        
        Args:
            mint: Token mint public key
            
        Returns:
            Dictionary with mint information
        """
        response = self.client.get_account_info(mint)
        if response.value is None:
            raise ValueError(f"Mint account not found: {mint}")
        
        account = response.value
        # Parse mint data (simplified - in production, use proper mint layout parsing)
        return {
            "address": str(mint),
            "owner": str(account.owner),
            "lamports": account.lamports,
            "data_length": len(account.data),
        }

    def calculate_token_amount(self, ui_amount: float, decimals: int) -> int:
        """
        Convert UI amount to token's smallest unit.
        
        Args:
            ui_amount: Amount in UI format (e.g., 1.5 tokens)
            decimals: Token decimals
            
        Returns:
            Amount in smallest unit
        """
        return int(ui_amount * (10 ** decimals))

    def calculate_ui_amount(self, amount: int, decimals: int) -> float:
        """
        Convert token's smallest unit to UI amount.
        
        Args:
            amount: Amount in smallest unit
            decimals: Token decimals
            
        Returns:
            Amount in UI format
        """
        return amount / (10 ** decimals)

    def verify_token_account(self, account: Pubkey) -> bool:
        """
        Verify that an account is a valid token account.
        
        Args:
            account: Account public key to verify
            
        Returns:
            True if account is a valid token account, False otherwise
        """
        try:
            response = self.client.get_account_info(account)
            if response.value is None:
                return False
            
            # Check if owned by token program
            account_info = response.value
            return str(account_info.owner) == str(TOKEN_PROGRAM_ID)
        except Exception:
            return False

    @staticmethod
    def get_token_program_id() -> Pubkey:
        """
        Get the SPL Token program ID.
        
        Returns:
            Token program ID
        """
        return TOKEN_PROGRAM_ID

    @staticmethod
    def get_associated_token_program_id() -> Pubkey:
        """
        Get the Associated Token program ID.
        
        Returns:
            Associated Token program ID
        """
        return ASSOCIATED_TOKEN_PROGRAM_ID
