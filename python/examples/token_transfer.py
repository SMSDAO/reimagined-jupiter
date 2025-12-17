"""
Example: Token transfer using solana-py and solders.

This example demonstrates:
- Working with SPL tokens
- Getting token account balances
- Creating token transfer instructions
- Using associated token accounts
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
from src.token_operations import TokenOperations

# Load environment variables
load_dotenv()


def main():
    """
    Demonstrate token operations including balance queries and transfers.
    """
    print("=" * 60)
    print("Token Transfer Example - solana-py + solders")
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

    # Initialize token operations
    print("3. Initializing token operations...")
    token_ops = TokenOperations(rpc_client.client)
    print(f"   ✓ Token operations initialized")
    print(f"   Token Program ID: {token_ops.get_token_program_id()}")
    print(f"   Associated Token Program ID: {token_ops.get_associated_token_program_id()}")
    print()

    # Example: Get token accounts for the wallet
    print("4. Getting token accounts...")
    try:
        owner_pubkey = keypair_manager.get_public_key()
        token_accounts = token_ops.get_token_accounts_by_owner(owner_pubkey)
        
        if token_accounts:
            print(f"   ✓ Found {len(token_accounts)} token account(s)")
            for i, account in enumerate(token_accounts[:3]):  # Show first 3
                print(f"   Account {i+1}: {account.pubkey}")
        else:
            print("   No token accounts found (this is normal for new wallets)")
    except Exception as e:
        print(f"   Note: {e}")
    print()

    # Example: Calculate token amounts
    print("5. Token amount calculations...")
    print("   Example conversions:")
    
    # USDC has 6 decimals
    usdc_decimals = 6
    ui_amount = 10.5  # 10.5 USDC
    raw_amount = token_ops.calculate_token_amount(ui_amount, usdc_decimals)
    back_to_ui = token_ops.calculate_ui_amount(raw_amount, usdc_decimals)
    
    print(f"   USDC (6 decimals):")
    print(f"     UI Amount: {ui_amount}")
    print(f"     Raw Amount: {raw_amount:,}")
    print(f"     Back to UI: {back_to_ui}")
    print()
    
    # SOL/wSOL has 9 decimals
    sol_decimals = 9
    ui_amount = 1.5  # 1.5 SOL
    raw_amount = token_ops.calculate_token_amount(ui_amount, sol_decimals)
    back_to_ui = token_ops.calculate_ui_amount(raw_amount, sol_decimals)
    
    print(f"   SOL/wSOL (9 decimals):")
    print(f"     UI Amount: {ui_amount}")
    print(f"     Raw Amount: {raw_amount:,}")
    print(f"     Back to UI: {back_to_ui}")
    print()

    # Example: Get associated token address
    print("6. Associated token address example...")
    # Using USDC mint as example (mainnet)
    usdc_mint = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    owner_pubkey = keypair_manager.get_public_key()
    
    ata = token_ops.get_associated_token_address(owner_pubkey, usdc_mint)
    print(f"   Owner: {owner_pubkey}")
    print(f"   USDC Mint: {usdc_mint}")
    print(f"   ✓ Associated Token Address: {ata}")
    print()

    print("=" * 60)
    print("Example completed successfully!")
    print("=" * 60)
    print()
    print("Note: This example demonstrates token operations without")
    print("actually sending transactions. To send real token transfers,")
    print("build a transaction with token_ops.create_token_transfer_instruction()")
    print("and send it using TransactionBuilder.")


if __name__ == "__main__":
    main()
