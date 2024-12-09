// pages/BasicsView.tsx

import { FC, useState } from 'react';
import { CleaningWallet } from '../../components/CleaningWallet';

export const BasicsView: FC = () => {
    const [recipient, setRecipient] = useState('');

    return (
        <div className="md:hero mx-auto p-4">
            <div className="md:hero-content flex flex-col">
                <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mt-10 mb-8">
                KirbyFlux - Solana Version Demo
                </h1>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Enter recipient wallet address"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full p-3 border rounded-md text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="text-center">
                    <CleaningWallet recipient={recipient} />
                </div>
            </div>
        </div>
    );
};
