"""
Example: Basic transaction building and sending using solana-py and solders.

This example demonstrates:
- Creating a keypair
- Connecting to Solana RPC
- Building a simple SOL transfer transaction
- Signing and sending the transaction
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from solders.pubkey import Pubkey
from src.keypair_manager import KeypairManager
from src.rpc_client import SolanaRPCClient
from src.transaction_builder import TransactionBuilder

# Load environment variables
load_dotenv()


def main():
    """
    Demonstrate basic transaction building and signing.
    """
    print("=" * 60)
    print("Basic Transaction Example - solana-py + solders")
    print("=" * 60)
    print()

    # Initialize keypair manager
    print("1. Loading keypair...")
    try:
        keypair_manager = KeypairManager()
        public_key = keypair_manager.get_public_key_string()
        print(f"   ✓ Loaded keypair: {public_key}")
    except ValueError as e:
        print(f"   ✗ Error: {e}")
        print("   Set WALLET_PRIVATE_KEY in .env file")
        return
    print()

    # Initialize RPC client
    print("2. Connecting to Solana RPC...")
    rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
    print(f"   Using RPC: {rpc_url}")
    rpc_client = SolanaRPCClient(rpc_url)
    print(f"   ✓ Connected to Solana RPC")
    print()

    # Get balance
    print("3. Checking wallet balance...")
    try:
        balance = rpc_client.get_balance(keypair_manager.get_public_key())
        balance_sol = balance / 1_000_000_000
        print(f"   ✓ Balance: {balance_sol:.4f} SOL ({balance:,} lamports)")
    except Exception as e:
        print(f"   ✗ Error getting balance: {e}")
        return
    print()

    # Build a transaction (example - not actually sending)
    print("4. Building example transaction...")
    try:
        # Example destination (replace with actual address for real transaction)
        destination = Pubkey.from_string("11111111111111111111111111111111")
        amount_lamports = 1000  # 0.000001 SOL
        
        builder = TransactionBuilder(rpc_client.client, keypair_manager.keypair)
        builder.add_transfer(
            from_pubkey=keypair_manager.get_public_key(),
            to_pubkey=destination,
            lamports=amount_lamports
        )
        
        print(f"   Source: {keypair_manager.get_public_key_string()}")
        print(f"   Destination: {destination}")
        print(f"   Amount: {amount_lamports} lamports")
        print(f"   Instructions: {builder.get_instruction_count()}")
        print()
        
        # Build and sign (but don't send)
        print("5. Signing transaction...")
        transaction = builder.build_and_sign()
        tx_size = TransactionBuilder.estimate_transaction_size(transaction)
        print(f"   ✓ Transaction signed")
        print(f"   ✓ Transaction size: {tx_size} bytes")
        print()
        
        print("NOTE: This is a demo. Transaction was not sent to the network.")
        print("To send a real transaction, use rpc_client.send_transaction(transaction)")
        
    except Exception as e:
        print(f"   ✗ Error building transaction: {e}")
        return
    print()

    print("=" * 60)
    print("Example completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
