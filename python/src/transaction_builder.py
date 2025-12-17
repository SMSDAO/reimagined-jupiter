"""
Transaction builder module using solana-py and solders.

This module provides utilities for building and signing Solana transactions.
"""

from typing import List, Optional
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction
from solders.message import Message
from solders.instruction import Instruction, AccountMeta
from solders.hash import Hash


class TransactionBuilder:
    """
    Builder for constructing Solana transactions with multiple instructions.
    
    Uses solders for high-performance transaction construction and signing.
    """

    def __init__(self, client: Client, payer: Keypair):
        """
        Initialize the transaction builder.
        
        Args:
            client: Solana RPC client
            payer: Keypair that will pay for the transaction
        """
        self.client = client
        self.payer = payer
        self.instructions: List[Instruction] = []

    def add_instruction(self, instruction: Instruction) -> "TransactionBuilder":
        """
        Add an instruction to the transaction.
        
        Args:
            instruction: Instruction to add
            
        Returns:
            Self for method chaining
        """
        self.instructions.append(instruction)
        return self

    def add_transfer(
        self,
        from_pubkey: Pubkey,
        to_pubkey: Pubkey,
        lamports: int
    ) -> "TransactionBuilder":
        """
        Add a SOL transfer instruction to the transaction.
        
        Args:
            from_pubkey: Source account public key
            to_pubkey: Destination account public key
            lamports: Amount to transfer in lamports
            
        Returns:
            Self for method chaining
        """
        transfer_params = TransferParams(
            from_pubkey=from_pubkey,
            to_pubkey=to_pubkey,
            lamports=lamports
        )
        instruction = transfer(transfer_params)
        return self.add_instruction(instruction)

    def add_custom_instruction(
        self,
        program_id: Pubkey,
        accounts: List[AccountMeta],
        data: bytes
    ) -> "TransactionBuilder":
        """
        Add a custom instruction to the transaction.
        
        Args:
            program_id: Program ID to invoke
            accounts: List of account metadata
            data: Instruction data bytes
            
        Returns:
            Self for method chaining
        """
        instruction = Instruction(
            program_id=program_id,
            accounts=accounts,
            data=data
        )
        return self.add_instruction(instruction)

    def build(self, recent_blockhash: Optional[Hash] = None) -> Transaction:
        """
        Build the transaction with all added instructions.
        
        Args:
            recent_blockhash: Recent blockhash. If None, fetches from RPC.
            
        Returns:
            Unsigned Transaction object
        """
        if not self.instructions:
            raise ValueError("Transaction must have at least one instruction")
        
        # Get recent blockhash if not provided
        if recent_blockhash is None:
            response = self.client.get_latest_blockhash()
            recent_blockhash = response.value.blockhash
        
        # Create message with instructions
        message = Message.new_with_blockhash(
            self.instructions,
            self.payer.pubkey(),
            recent_blockhash
        )
        
        # Create transaction
        transaction = Transaction.new_unsigned(message)
        return transaction

    def build_and_sign(
        self,
        signers: Optional[List[Keypair]] = None,
        recent_blockhash: Optional[Hash] = None
    ) -> Transaction:
        """
        Build and sign the transaction.
        
        Args:
            signers: List of keypairs to sign with. If None, only payer signs.
            recent_blockhash: Recent blockhash. If None, fetches from RPC.
            
        Returns:
            Signed Transaction object
        """
        # Build unsigned transaction
        transaction = self.build(recent_blockhash)
        
        # Determine signers
        if signers is None:
            signers = [self.payer]
        elif self.payer not in signers:
            signers = [self.payer] + signers
        
        # Sign transaction
        transaction.sign(signers)
        return transaction

    def reset(self) -> "TransactionBuilder":
        """
        Clear all instructions from the builder.
        
        Returns:
            Self for method chaining
        """
        self.instructions = []
        return self

    @staticmethod
    def create_transfer_transaction(
        client: Client,
        payer: Keypair,
        to_pubkey: Pubkey,
        lamports: int,
        recent_blockhash: Optional[Hash] = None
    ) -> Transaction:
        """
        Create and sign a simple SOL transfer transaction.
        
        Args:
            client: Solana RPC client
            payer: Keypair paying for and sending the transfer
            to_pubkey: Destination public key
            lamports: Amount to transfer in lamports
            recent_blockhash: Recent blockhash. If None, fetches from RPC.
            
        Returns:
            Signed transaction ready to send
        """
        builder = TransactionBuilder(client, payer)
        return builder.add_transfer(
            from_pubkey=payer.pubkey(),
            to_pubkey=to_pubkey,
            lamports=lamports
        ).build_and_sign(recent_blockhash=recent_blockhash)

    @staticmethod
    def estimate_transaction_size(transaction: Transaction) -> int:
        """
        Estimate the size of a transaction in bytes.
        
        Args:
            transaction: Transaction to estimate
            
        Returns:
            Estimated size in bytes
        """
        # Serialize and get length
        return len(bytes(transaction))

    def get_instruction_count(self) -> int:
        """
        Get the number of instructions in the builder.
        
        Returns:
            Number of instructions
        """
        return len(self.instructions)
