"""
Tests for KeypairManager module.
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from src.keypair_manager import KeypairManager


class TestKeypairManager:
    """Test cases for KeypairManager."""

    def test_generate_keypair(self):
        """Test keypair generation."""
        keypair = KeypairManager.generate_keypair()
        assert isinstance(keypair, Keypair)
        assert isinstance(keypair.pubkey(), Pubkey)

    def test_keypair_from_string(self):
        """Test loading keypair from base58 string."""
        # Generate a test keypair
        test_keypair = Keypair()
        private_key_bytes = bytes(test_keypair)
        
        # Encode to base58
        from base58 import b58encode
        private_key_b58 = b58encode(private_key_bytes).decode('utf-8')
        
        # Load from base58
        manager = KeypairManager(private_key_b58)
        
        # Verify the public keys match
        assert str(manager.get_public_key()) == str(test_keypair.pubkey())

    def test_get_public_key(self):
        """Test getting public key from keypair."""
        keypair = KeypairManager.generate_keypair()
        manager = KeypairManager.__new__(KeypairManager)
        manager.keypair = keypair
        
        pubkey = manager.get_public_key()
        assert isinstance(pubkey, Pubkey)
        assert pubkey == keypair.pubkey()

    def test_get_public_key_string(self):
        """Test getting public key as string."""
        keypair = KeypairManager.generate_keypair()
        manager = KeypairManager.__new__(KeypairManager)
        manager.keypair = keypair
        
        pubkey_str = manager.get_public_key_string()
        assert isinstance(pubkey_str, str)
        assert len(pubkey_str) > 0
        assert str(keypair.pubkey()) == pubkey_str

    def test_get_private_key_bytes(self):
        """Test getting private key as bytes."""
        keypair = KeypairManager.generate_keypair()
        manager = KeypairManager.__new__(KeypairManager)
        manager.keypair = keypair
        
        private_bytes = manager.get_private_key_bytes()
        assert isinstance(private_bytes, bytes)
        assert len(private_bytes) == 64  # Ed25519 keypair is 64 bytes

    def test_get_private_key_base58(self):
        """Test getting private key as base58 string."""
        keypair = KeypairManager.generate_keypair()
        manager = KeypairManager.__new__(KeypairManager)
        manager.keypair = keypair
        
        private_b58 = manager.get_private_key_base58()
        assert isinstance(private_b58, str)
        assert len(private_b58) > 0

    def test_sign_message(self):
        """Test message signing."""
        keypair = KeypairManager.generate_keypair()
        manager = KeypairManager.__new__(KeypairManager)
        manager.keypair = keypair
        
        message = b"Hello, Solana!"
        signature = manager.sign_message(message)
        
        # solders returns a Signature object, not raw bytes
        assert signature is not None
        assert len(bytes(signature)) > 0

    def test_invalid_private_key(self):
        """Test that invalid private key raises error."""
        with pytest.raises(ValueError):
            KeypairManager("invalid_key_string")

    def test_keypair_uniqueness(self):
        """Test that generated keypairs are unique."""
        keypair1 = KeypairManager.generate_keypair()
        keypair2 = KeypairManager.generate_keypair()
        
        assert str(keypair1.pubkey()) != str(keypair2.pubkey())
