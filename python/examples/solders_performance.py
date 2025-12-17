"""
Example: Demonstrating solders high-performance features.

This example shows:
- Performance benefits of solders for transaction operations
- Batch transaction simulation
- Efficient keypair operations
- Transaction serialization performance
"""

import os
import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from src.keypair_manager import KeypairManager
from src.rpc_client import SolanaRPCClient
from src.transaction_builder import TransactionBuilder

# Load environment variables
load_dotenv()


def benchmark_keypair_generation(count: int = 100):
    """
    Benchmark keypair generation using solders.
    
    Args:
        count: Number of keypairs to generate
    """
    print(f"Generating {count} keypairs using solders...")
    start = time.time()
    
    keypairs = []
    for _ in range(count):
        keypair = Keypair()
        keypairs.append(keypair)
    
    elapsed = time.time() - start
    rate = count / elapsed
    
    print(f"✓ Generated {count} keypairs in {elapsed:.3f}s")
    print(f"  Rate: {rate:.0f} keypairs/second")
    print(f"  Example pubkey: {keypairs[0].pubkey()}")
    return keypairs


def benchmark_transaction_building(rpc_client, payer_keypair, count: int = 50):
    """
    Benchmark transaction building using solders.
    
    Args:
        rpc_client: RPC client instance
        payer_keypair: Keypair to use as payer
        count: Number of transactions to build
    """
    print(f"\nBuilding {count} transactions using solders...")
    start = time.time()
    
    transactions = []
    destination = Pubkey.from_string("11111111111111111111111111111111")
    
    for _ in range(count):
        builder = TransactionBuilder(rpc_client.client, payer_keypair)
        builder.add_transfer(
            from_pubkey=payer_keypair.pubkey(),
            to_pubkey=destination,
            lamports=1000
        )
        tx = builder.build_and_sign()
        transactions.append(tx)
    
    elapsed = time.time() - start
    rate = count / elapsed
    
    print(f"✓ Built and signed {count} transactions in {elapsed:.3f}s")
    print(f"  Rate: {rate:.0f} transactions/second")
    print(f"  Average transaction size: {sum(len(bytes(tx)) for tx in transactions) // count} bytes")
    return transactions


def demonstrate_transaction_simulation(rpc_client, transactions):
    """
    Demonstrate efficient transaction simulation.
    
    Args:
        rpc_client: RPC client instance
        transactions: List of transactions to simulate
    """
    print(f"\nSimulating {min(3, len(transactions))} transactions...")
    
    for i, tx in enumerate(transactions[:3]):
        try:
            result = rpc_client.simulate_transaction(tx)
            if result["error"]:
                print(f"  Transaction {i+1}: Error - {result['error']}")
            else:
                print(f"  Transaction {i+1}: Success")
                print(f"    Compute units: {result.get('units_consumed', 'N/A')}")
        except Exception as e:
            print(f"  Transaction {i+1}: Simulation error - {e}")


def main():
    """
    Demonstrate solders performance features.
    """
    print("=" * 60)
    print("Solders Performance Example")
    print("=" * 60)
    print()
    print("This example demonstrates the high-performance capabilities")
    print("of solders for Solana operations.")
    print()

    # Initialize keypair manager
    try:
        keypair_manager = KeypairManager()
        print(f"Loaded keypair: {keypair_manager.get_public_key_string()}")
    except ValueError as e:
        print(f"Error: {e}")
        print("Using a temporary keypair for benchmarks...")
        keypair_manager = KeypairManager.__new__(KeypairManager)
        keypair_manager.keypair = Keypair()
    print()

    # Initialize RPC client
    rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
    print(f"Connecting to: {rpc_url}")
    rpc_client = SolanaRPCClient(rpc_url)
    print()

    print("=" * 60)
    print("Performance Benchmarks")
    print("=" * 60)
    print()

    # Benchmark 1: Keypair generation
    keypairs = benchmark_keypair_generation(100)

    # Benchmark 2: Transaction building
    transactions = benchmark_transaction_building(
        rpc_client,
        keypair_manager.keypair,
        50
    )

    # Demonstrate transaction simulation
    demonstrate_transaction_simulation(rpc_client, transactions)

    print()
    print("=" * 60)
    print("Key Benefits of solders:")
    print("=" * 60)
    print()
    print("1. High Performance: Written in Rust, compiled to native code")
    print("2. Type Safety: Strong typing reduces runtime errors")
    print("3. Memory Efficient: Optimized memory usage for large-scale operations")
    print("4. Compatibility: Seamless integration with solana-py")
    print("5. Modern API: Pythonic interface with Rust performance")
    print()
    print("These benchmarks show solders can handle:")
    print("- Hundreds of keypair operations per second")
    print("- Rapid transaction building and signing")
    print("- Efficient serialization and deserialization")
    print()
    print("=" * 60)
    print("Example completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
