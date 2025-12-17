"""
Keypair management module using solana-py and solders.

This module provides utilities for creating, loading, and managing Solana keypairs.
"""

import os
from typing import Optional
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from base58 import b58decode, b58encode


class KeypairManager:
    """
    Manages Solana keypairs for transaction signing and wallet operations.
    
    Uses solders.keypair.Keypair for high-performance key operations.
    """

    def __init__(self, private_key: Optional[str] = None, keypair: Optional[Keypair] = None):
        """
        Initialize KeypairManager with an optional private key or keypair.
        
        Args:
            private_key: Base58-encoded private key string. If None, loads from WALLET_PRIVATE_KEY env var.
            keypair: Pre-initialized Keypair object. If provided, private_key is ignored.
        """
        if keypair is not None:
            # Use provided keypair directly (useful for testing)
            self.keypair = keypair
        elif private_key is not None:
            # Load from provided private key
            self.keypair = self._load_keypair(private_key)
        else:
            # Try to load from environment variable
            private_key = os.getenv("WALLET_PRIVATE_KEY")
            if not private_key:
                raise ValueError("Private key must be provided or set in WALLET_PRIVATE_KEY env var")
            self.keypair = self._load_keypair(private_key)

    def _load_keypair(self, private_key: str) -> Keypair:
        """
        Load a keypair from a base58-encoded private key string.
        
        Args:
            private_key: Base58-encoded private key string
            
        Returns:
            Keypair object
        """
        try:
            # Decode base58 private key
            secret_key = b58decode(private_key)
            # Create keypair from secret key using solders
            return Keypair.from_bytes(secret_key)
        except Exception as e:
            raise ValueError(f"Failed to load keypair: {str(e)}")

    @staticmethod
    def generate_keypair() -> Keypair:
        """
        Generate a new random keypair.
        
        Returns:
            New Keypair object
        """
        return Keypair()

    def get_public_key(self) -> Pubkey:
        """
        Get the public key from the keypair.
        
        Returns:
            Public key as Pubkey object
        """
        return self.keypair.pubkey()

    def get_public_key_string(self) -> str:
        """
        Get the public key as a base58-encoded string.
        
        Returns:
            Public key as base58 string
        """
        return str(self.keypair.pubkey())

    def get_private_key_bytes(self) -> bytes:
        """
        Get the private key as bytes.
        
        WARNING: Handle with care! Never expose private keys.
        
        Returns:
            Private key as bytes
        """
        return bytes(self.keypair)

    def get_private_key_base58(self) -> str:
        """
        Get the private key as a base58-encoded string.
        
        WARNING: Handle with care! Never expose private keys.
        
        Returns:
            Private key as base58 string
        """
        return b58encode(bytes(self.keypair)).decode('utf-8')

    def sign_message(self, message: bytes) -> bytes:
        """
        Sign a message with the keypair.
        
        Args:
            message: Message bytes to sign
            
        Returns:
            Signature bytes
        """
        return self.keypair.sign_message(message)

    @staticmethod
    def verify_signature(pubkey: Pubkey, message: bytes, signature: bytes) -> bool:
        """
        Verify a signature against a public key and message.
        
        NOTE: This is a placeholder method. For production use, implement proper
        ed25519 signature verification using appropriate cryptographic libraries.
        
        Args:
            pubkey: Public key to verify against
            message: Original message bytes
            signature: Signature bytes to verify
            
        Returns:
            True if signature is valid, False otherwise
            
        Raises:
            NotImplementedError: This method is not yet implemented
        """
        raise NotImplementedError(
            "Signature verification is not yet implemented. "
            "For production use, implement proper ed25519 signature verification."
        )
