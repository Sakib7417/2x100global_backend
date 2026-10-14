import { Request, Response, NextFunction } from 'express';
import { blockchainService } from '../service/blockchain.service';
import { VerifyTransactionInput, GetBalanceInput, GetTokenBalanceInput } from '../validator/blockchain.validator';

export class BlockchainController {
  /**
   * Verify transaction
   */
  async verifyTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: VerifyTransactionInput = req.body;
      const result = await blockchainService.verifyTransaction(data);
      
      res.status(200).json({
        success: true,
        message: 'Transaction verified successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: GetBalanceInput = req.query as any;
      const balance = await blockchainService.getBalance(data.address, data.network);
      
      res.status(200).json({
        success: true,
        data: { balance },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: GetTokenBalanceInput = req.query as any;
      const balance = await blockchainService.getTokenBalance(data.address, data.tokenContract, data.network);
      
      res.status(200).json({
        success: true,
        data: { balance },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactionHash = req.params.hash;
      const network = req.query.network as string || (process.env.BLOCKCHAIN_NETWORK || 'bsc-mainnet');
      
      const receipt = await blockchainService.getTransactionReceipt(transactionHash, network);
      
      if (!receipt) {
        res.status(404).json({
          success: false,
          message: 'Transaction receipt not found',
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check network health
   */
  async checkNetworkHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const network = req.query.network as string || (process.env.BLOCKCHAIN_NETWORK || 'bsc-mainnet');
      const healthy = await blockchainService.checkNetworkHealth(network);
      
      res.status(200).json({
        success: true,
        data: { healthy, network },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const blockchainController = new BlockchainController();
