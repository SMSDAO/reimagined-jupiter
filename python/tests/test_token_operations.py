"""
Tests for TokenOperations module.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from spl.token.constants import TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
from src.token_operations import TokenOperations


class TestTokenOperations:
    """Test cases for TokenOperations."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock RPC client."""
        return Mock()

    @pytest.fixture
    def token_ops(self, mock_client):
        """Create a TokenOperations instance."""
        return TokenOperations(mock_client)

    def test_initialization(self, mock_client):
        """Test TokenOperations initialization."""
        token_ops = TokenOperations(mock_client)
        assert token_ops.client == mock_client

    def test_get_token_program_id(self):
        """Test getting token program ID."""
        program_id = TokenOperations.get_token_program_id()
        assert isinstance(program_id, Pubkey)
        assert program_id == TOKEN_PROGRAM_ID

    def test_get_associated_token_program_id(self):
        """Test getting associated token program ID."""
        program_id = TokenOperations.get_associated_token_program_id()
        assert isinstance(program_id, Pubkey)
        assert program_id == ASSOCIATED_TOKEN_PROGRAM_ID

    def test_get_associated_token_address(self, token_ops):
        """Test getting associated token address."""
        owner = Keypair().pubkey()
        mint = Keypair().pubkey()
        
        ata = token_ops.get_associated_token_address(owner, mint)
        assert isinstance(ata, Pubkey)
        
        # Should return same address for same inputs
        ata2 = token_ops.get_associated_token_address(owner, mint)
        assert ata == ata2
        
        # Should return different address for different owner
        owner2 = Keypair().pubkey()
        ata3 = token_ops.get_associated_token_address(owner2, mint)
        assert ata != ata3

    def test_calculate_token_amount(self, token_ops):
        """Test converting UI amount to raw amount."""
        # Test with USDC (6 decimals)
        ui_amount = 10.5
        decimals = 6
        raw_amount = token_ops.calculate_token_amount(ui_amount, decimals)
        assert raw_amount == 10_500_000

        # Test with SOL (9 decimals)
        ui_amount = 1.5
        decimals = 9
        raw_amount = token_ops.calculate_token_amount(ui_amount, decimals)
        assert raw_amount == 1_500_000_000

        # Test with whole number
        ui_amount = 100.0
        decimals = 6
        raw_amount = token_ops.calculate_token_amount(ui_amount, decimals)
        assert raw_amount == 100_000_000

    def test_calculate_ui_amount(self, token_ops):
        """Test converting raw amount to UI amount."""
        # Test with USDC (6 decimals)
        raw_amount = 10_500_000
        decimals = 6
        ui_amount = token_ops.calculate_ui_amount(raw_amount, decimals)
        assert ui_amount == 10.5

        # Test with SOL (9 decimals)
        raw_amount = 1_500_000_000
        decimals = 9
        ui_amount = token_ops.calculate_ui_amount(raw_amount, decimals)
        assert ui_amount == 1.5

        # Test with whole number
        raw_amount = 100_000_000
        decimals = 6
        ui_amount = token_ops.calculate_ui_amount(raw_amount, decimals)
        assert ui_amount == 100.0

    def test_amount_conversion_roundtrip(self, token_ops):
        """Test that amount conversions are reversible."""
        ui_amount = 12.345
        decimals = 9
        
        # Convert UI to raw
        raw_amount = token_ops.calculate_token_amount(ui_amount, decimals)
        
        # Convert back to UI
        ui_amount_result = token_ops.calculate_ui_amount(raw_amount, decimals)
        
        # Should match original (within floating point precision)
        assert abs(ui_amount - ui_amount_result) < 1e-9

    def test_create_associated_token_account_instruction(self, token_ops):
        """Test creating ATA instruction."""
        payer = Keypair().pubkey()
        owner = Keypair().pubkey()
        mint = Keypair().pubkey()
        
        instruction = token_ops.create_associated_token_account_instruction(
            payer, owner, mint
        )
        
        # Verify it's a valid instruction
        assert instruction is not None
        assert hasattr(instruction, 'program_id')
        assert hasattr(instruction, 'accounts')
        assert hasattr(instruction, 'data')

    def test_create_token_transfer_instruction(self, token_ops):
        """Test creating token transfer instruction."""
        source = Keypair().pubkey()
        dest = Keypair().pubkey()
        owner = Keypair().pubkey()
        mint = Keypair().pubkey()
        amount = 1_000_000
        decimals = 6
        
        instruction = token_ops.create_token_transfer_instruction(
            source=source,
            dest=dest,
            owner=owner,
            amount=amount,
            decimals=decimals,
            mint=mint
        )
        
        # Verify it's a valid instruction
        assert instruction is not None
        assert hasattr(instruction, 'program_id')
        assert instruction.program_id == TOKEN_PROGRAM_ID

    def test_zero_amount_calculation(self, token_ops):
        """Test handling zero amounts."""
        ui_amount = 0.0
        decimals = 6
        raw_amount = token_ops.calculate_token_amount(ui_amount, decimals)
        assert raw_amount == 0
        
        ui_amount_result = token_ops.calculate_ui_amount(raw_amount, decimals)
        assert ui_amount_result == 0.0

    def test_large_amount_calculation(self, token_ops):
        """Test handling large amounts."""
        ui_amount = 1_000_000.0  # 1 million tokens
        decimals = 9
        raw_amount = token_ops.calculate_token_amount(ui_amount, decimals)
        assert raw_amount == 1_000_000_000_000_000
        
        ui_amount_result = token_ops.calculate_ui_amount(raw_amount, decimals)
        assert ui_amount_result == ui_amount
