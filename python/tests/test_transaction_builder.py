"""
Tests for TransactionBuilder module.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from src.transaction_builder import TransactionBuilder


class TestTransactionBuilder:
    """Test cases for TransactionBuilder."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock RPC client."""
        from solders.hash import Hash
        client = Mock()
        # Mock get_latest_blockhash with a real Hash object
        mock_response = Mock()
        mock_response.value = Mock()
        # Create a real Hash object (using zero hash for testing)
        mock_response.value.blockhash = Hash.default()
        client.get_latest_blockhash.return_value = mock_response
        return client

    @pytest.fixture
    def test_keypair(self):
        """Create a test keypair."""
        return Keypair()

    @pytest.fixture
    def builder(self, mock_client, test_keypair):
        """Create a TransactionBuilder instance."""
        return TransactionBuilder(mock_client, test_keypair)

    def test_initialization(self, mock_client, test_keypair):
        """Test TransactionBuilder initialization."""
        builder = TransactionBuilder(mock_client, test_keypair)
        assert builder.client == mock_client
        assert builder.payer == test_keypair
        assert len(builder.instructions) == 0

    def test_add_instruction(self, builder):
        """Test adding an instruction."""
        instruction = Instruction(
            program_id=SYSTEM_PROGRAM_ID,
            accounts=[],
            data=bytes([])
        )
        
        result = builder.add_instruction(instruction)
        assert result == builder  # Test method chaining
        assert len(builder.instructions) == 1
        assert builder.instructions[0] == instruction

    def test_add_transfer(self, builder, test_keypair):
        """Test adding a transfer instruction."""
        destination = Keypair().pubkey()
        lamports = 1000000
        
        result = builder.add_transfer(
            from_pubkey=test_keypair.pubkey(),
            to_pubkey=destination,
            lamports=lamports
        )
        
        assert result == builder  # Test method chaining
        assert len(builder.instructions) == 1
        # Verify it's a system program instruction
        assert builder.instructions[0].program_id == SYSTEM_PROGRAM_ID

    def test_add_custom_instruction(self, builder):
        """Test adding a custom instruction."""
        program_id = Keypair().pubkey()
        accounts = [
            AccountMeta(pubkey=Keypair().pubkey(), is_signer=True, is_writable=True)
        ]
        data = bytes([1, 2, 3, 4])
        
        result = builder.add_custom_instruction(program_id, accounts, data)
        
        assert result == builder
        assert len(builder.instructions) == 1
        assert builder.instructions[0].program_id == program_id
        assert builder.instructions[0].data == data

    def test_get_instruction_count(self, builder, test_keypair):
        """Test getting instruction count."""
        assert builder.get_instruction_count() == 0
        
        destination = Keypair().pubkey()
        builder.add_transfer(test_keypair.pubkey(), destination, 1000)
        assert builder.get_instruction_count() == 1
        
        builder.add_transfer(test_keypair.pubkey(), destination, 2000)
        assert builder.get_instruction_count() == 2

    def test_reset(self, builder, test_keypair):
        """Test resetting the builder."""
        destination = Keypair().pubkey()
        builder.add_transfer(test_keypair.pubkey(), destination, 1000)
        assert len(builder.instructions) == 1
        
        result = builder.reset()
        assert result == builder
        assert len(builder.instructions) == 0

    def test_build_without_instructions(self, builder):
        """Test that building without instructions raises error."""
        with pytest.raises(ValueError, match="at least one instruction"):
            builder.build()

    def test_method_chaining(self, builder, test_keypair):
        """Test method chaining works correctly."""
        destination1 = Keypair().pubkey()
        destination2 = Keypair().pubkey()
        
        result = (builder
                  .add_transfer(test_keypair.pubkey(), destination1, 1000)
                  .add_transfer(test_keypair.pubkey(), destination2, 2000))
        
        assert result == builder
        assert len(builder.instructions) == 2

    def test_estimate_transaction_size(self, builder, test_keypair):
        """Test estimating transaction size."""
        destination = Keypair().pubkey()
        builder.add_transfer(test_keypair.pubkey(), destination, 1000)
        
        # Build transaction
        transaction = builder.build_and_sign()
        
        # Estimate size
        size = TransactionBuilder.estimate_transaction_size(transaction)
        assert isinstance(size, int)
        assert size > 0
        # Typical transaction size should be reasonable
        assert size < 2000  # Max transaction size check

    def test_multiple_instructions(self, builder, test_keypair):
        """Test building transaction with multiple instructions."""
        destination1 = Keypair().pubkey()
        destination2 = Keypair().pubkey()
        destination3 = Keypair().pubkey()
        
        builder.add_transfer(test_keypair.pubkey(), destination1, 1000)
        builder.add_transfer(test_keypair.pubkey(), destination2, 2000)
        builder.add_transfer(test_keypair.pubkey(), destination3, 3000)
        
        assert builder.get_instruction_count() == 3
        
        # Should be able to build with multiple instructions
        transaction = builder.build_and_sign()
        assert transaction is not None
