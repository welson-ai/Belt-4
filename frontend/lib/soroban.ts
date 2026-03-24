import StellarSdk, { 
  xdr,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Soroban
} from '@stellar/stellar-sdk';
import freighterApi from '@stellar/freighter-api';

// Contract addresses - these should be loaded from environment or config
const CONTRACT_ADDRESSES = {
  LENDING_POOL: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '',
  LXLM_TOKEN: process.env.NEXT_PUBLIC_LXLM_TOKEN_ADDRESS || '',
  LIQUIDATION: process.env.NEXT_PUBLIC_LIQUIDATION_ADDRESS || '',
};

// Network configuration
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' 
  ? Networks.PUBLIC 
  : Networks.TESTNET;

const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

// Initialize RPC server - using any type for now to handle API differences
const rpcServer: any = null; // Will be initialized when needed

export interface UserPosition {
  deposited: string;
  borrowed: string;
  last_update_ledger: number;
}

export interface ContractResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
}

export interface TransactionStatus {
  status: 'pending' | 'success' | 'failed';
  hash?: string;
  error?: string;
}

/**
 * Helper class for Soroban contract interactions
 */
export class SorobanHelper {
  private server: any;
  private networkPassphrase: string;

  constructor() {
    this.server = rpcServer;
    this.networkPassphrase = NETWORK_PASSPHRASE;
  }

  /**
   * Get the current connected wallet address
   */
  async getWalletAddress(): Promise<string | null> {
    try {
      const { address: walletAddress } = await freighterApi.getAddress();
      return walletAddress;
    } catch (error) {
      console.error('Failed to get wallet address:', error);
      return null;
    }
  }

  /**
   * Sign and submit a transaction
   */
  async signAndSubmitTransaction(
    transaction: any,
    simulate = false
  ): Promise<ContractResult> {
    try {
      // Get the signed transaction from Freighter
      const signedTx = await freighterApi.signTransaction(
        transaction.toXDR(),
        { networkPassphrase: this.networkPassphrase }
      );

      const tx = StellarSdk.TransactionBuilder.fromXDR(signedTx, this.networkPassphrase);

      if (simulate) {
        const simResult = await this.server.simulateTransaction(tx);
        return { success: true, data: simResult };
      }

      const result = await this.server.sendTransaction(tx);
      
      if (result.status === 'PENDING') {
        // Wait for transaction confirmation
        const txResult = await this.server.getTransaction(result.hash);
        
        if (txResult.status === 'SUCCESS') {
          return { 
            success: true, 
            data: txResult.result,
            transactionHash: result.hash 
          };
        } else {
          return { 
            success: false, 
            error: 'Transaction failed',
            transactionHash: result.hash 
          };
        }
      } else {
        return { 
          success: false, 
          error: result.errorResult?.toString() || 'Unknown error' 
        };
      }
    } catch (error) {
      console.error('Transaction error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Build a contract invocation transaction
   */
  async buildContractTransaction(
    contractAddress: string,
    methodName: string,
    args: xdr.ScVal[],
    publicKey: string
  ): Promise<any> {
    const account = await this.server.getAccount(publicKey);
    
    const contract = new StellarSdk.Contract(contractAddress);
    const operation = contract.call(methodName, ...args);

    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
  }

  /**
   * Lending Pool Contract Methods
   */
  async deposit(amount: string): Promise<ContractResult> {
    const address = await this.getWalletAddress();
    if (!address) return { success: false, error: 'Wallet not connected' };

    const amountScVal = xdr.ScVal.scvI64(new xdr.Int64(BigInt(amount)));
    const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(address).toScAddress());

    const tx = await this.buildContractTransaction(
      CONTRACT_ADDRESSES.LENDING_POOL,
      'deposit',
      [userScVal, amountScVal],
      address
    );

    return this.signAndSubmitTransaction(tx);
  }

  async borrow(amount: string): Promise<ContractResult> {
    const address = await this.getWalletAddress();
    if (!address) return { success: false, error: 'Wallet not connected' };

    const amountScVal = xdr.ScVal.scvI64(new xdr.Int64(BigInt(amount)));
    const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(address).toScAddress());

    const tx = await this.buildContractTransaction(
      CONTRACT_ADDRESSES.LENDING_POOL,
      'borrow',
      [userScVal, amountScVal],
      address
    );

    return this.signAndSubmitTransaction(tx);
  }

  async repay(amount: string): Promise<ContractResult> {
    const address = await this.getWalletAddress();
    if (!address) return { success: false, error: 'Wallet not connected' };

    const amountScVal = xdr.ScVal.scvI64(new xdr.Int64(BigInt(amount)));
    const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(address).toScAddress());

    const tx = await this.buildContractTransaction(
      CONTRACT_ADDRESSES.LENDING_POOL,
      'repay',
      [userScVal, amountScVal],
      address
    );

    return this.signAndSubmitTransaction(tx);
  }

  async withdraw(amount: string): Promise<ContractResult> {
    const address = await this.getWalletAddress();
    if (!address) return { success: false, error: 'Wallet not connected' };

    const amountScVal = xdr.ScVal.scvI64(new xdr.Int64(BigInt(amount)));
    const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(address).toScAddress());

    const tx = await this.buildContractTransaction(
      CONTRACT_ADDRESSES.LENDING_POOL,
      'withdraw',
      [userScVal, amountScVal],
      address
    );

    return this.signAndSubmitTransaction(tx);
  }

  async getUserPosition(): Promise<ContractResult<UserPosition>> {
    const address = await this.getWalletAddress();
    if (!address) return { success: false, error: 'Wallet not connected' };

    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESSES.LENDING_POOL);
      const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(address).toScAddress());

      const result = await this.server.simulateTransaction(
        new TransactionBuilder(new StellarSdk.Account(address, '1'), {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call('get_position', userScVal))
          .setTimeout(30)
          .build()
      );

      if (result.result && result.result.retval) {
        const positionData = result.result.retval;
        const position = this.parseUserPosition(positionData);
        return { success: true, data: position };
      }

      return { success: false, error: 'Failed to fetch position' };
    } catch (error) {
      console.error('Error fetching position:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getHealthFactor(): Promise<ContractResult<number>> {
    const address = await this.getWalletAddress();
    if (!address) return { success: false, error: 'Wallet not connected' };

    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESSES.LENDING_POOL);
      const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(address).toScAddress());

      const result = await this.server.simulateTransaction(
        new TransactionBuilder(new StellarSdk.Account(address, '1'), {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call('get_health_factor', userScVal))
          .setTimeout(30)
          .build()
      );

      if (result.result && result.result.retval) {
        const healthFactor = Number(result.result.retval.value());
        return { success: true, data: healthFactor };
      }

      return { success: false, error: 'Failed to fetch health factor' };
    } catch (error) {
      console.error('Error fetching health factor:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getTotalDeposited(): Promise<ContractResult<number>> {
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESSES.LENDING_POOL);

      const result = await this.server.simulateTransaction(
        new TransactionBuilder(new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '1'), {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call('get_total_deposited'))
          .setTimeout(30)
          .build()
      );

      if (result.result && result.result.retval) {
        const total = Number(result.result.retval.value());
        return { success: true, data: total };
      }

      return { success: false, error: 'Failed to fetch total deposited' };
    } catch (error) {
      console.error('Error fetching total deposited:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getTotalBorrowed(): Promise<ContractResult<number>> {
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESSES.LENDING_POOL);

      const result = await this.server.simulateTransaction(
        new TransactionBuilder(new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '1'), {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call('get_total_borrowed'))
          .setTimeout(30)
          .build()
      );

      if (result.result && result.result.retval) {
        const total = Number(result.result.retval.value());
        return { success: true, data: total };
      }

      return { success: false, error: 'Failed to fetch total borrowed' };
    } catch (error) {
      console.error('Error fetching total borrowed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * LXLM Token Contract Methods
   */
  async getLXLMBalance(address?: string): Promise<ContractResult<number>> {
    const userAddress = address || await this.getWalletAddress();
    if (!userAddress) return { success: false, error: 'Wallet not connected' };

    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESSES.LXLM_TOKEN);
      const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(userAddress).toScAddress());

      const result = await this.server.simulateTransaction(
        new TransactionBuilder(new StellarSdk.Account(userAddress, '1'), {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call('balance', userScVal))
          .setTimeout(30)
          .build()
      );

      if (result.result && result.result.retval) {
        const balance = Number(result.result.retval.value());
        return { success: true, data: balance };
      }

      return { success: false, error: 'Failed to fetch balance' };
    } catch (error) {
      console.error('Error fetching balance:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Liquidation Contract Methods
   */
  async hasLiquidatablePosition(userAddress: string): Promise<ContractResult<boolean>> {
    try {
      const contract = new StellarSdk.Contract(CONTRACT_ADDRESSES.LIQUIDATION);
      const userScVal = xdr.ScVal.scvAddress(StellarSdk.Address.fromString(userAddress).toScAddress());

      const result = await this.server.simulateTransaction(
        new TransactionBuilder(new StellarSdk.Account(userAddress, '1'), {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call('has_liquidatable_position', userScVal))
          .setTimeout(30)
          .build()
      );

      if (result.result && result.result.retval) {
        const isLiquidatable = result.result.retval.value() === xdr.ScVal.scvBool(true).value();
        return { success: true, data: isLiquidatable };
      }

      return { success: false, error: 'Failed to check liquidation status' };
    } catch (error) {
      console.error('Error checking liquidation status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Helper method to parse UserPosition from XDR
   */
  private parseUserPosition(positionData: xdr.ScVal): UserPosition {
    try {
      // For now, return a default position structure
      // In a real implementation, you would parse the XDR properly
      // based on your specific contract's data structure
      return {
        deposited: '0',
        borrowed: '0',
        last_update_ledger: 0,
      };
    } catch (error) {
      console.error('Error parsing position:', error);
      return {
        deposited: '0',
        borrowed: '0',
        last_update_ledger: 0,
      };
    }
  }

  /**
   * Format XLM amount for display
   */
  static formatXLM(amount: string | number): string {
    const num = Number(amount);
    return (num / 10_000_000).toFixed(7);
  }

  /**
   * Parse XLM amount to stroops
   */
  static parseXLM(amount: string): string {
    const num = parseFloat(amount);
    return (num * 10_000_000).toString();
  }
}

// Export singleton instance
export const sorobanHelper = new SorobanHelper();
