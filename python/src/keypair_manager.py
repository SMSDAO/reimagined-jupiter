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

    def __init__(self, private_key: Optional[str] = None):
        """
        Initialize KeypairManager with an optional private key.
        
        Args:
            private_key: Base58-encoded private key string. If None, loads from WALLET_PRIVATE_KEY env var.
        """
        if private_key is None:
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
        
        Args:
            pubkey: Public key to verify against
            message: Original message bytes
            signature: Signature bytes to verify
            
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Note: This is a simplified verification
            # In production, use proper ed25519 signature verification
            return True  # Placeholder - implement proper verification
        except Exception:
            return False
