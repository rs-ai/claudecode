// Bloom 2026 - Wallet & Contract Integration

(function() {
    'use strict';

    // ============ Configuration ============

    // Base Mainnet
    const BASE_CHAIN_ID = '0x2105'; // 8453 in hex
    const BASE_CHAIN_CONFIG = {
        chainId: BASE_CHAIN_ID,
        chainName: 'Base',
        nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
    };

    // Contract details
    const CONTRACT_ADDRESS = '0xa9B31F7fa97895B22D04172A4c282d8f2f28E95f';
    const CONTRACT_ABI = [
        'function checkIn() external',
        'function getCurrentWeek() public view returns (uint256)',
        'function hasCheckedIn(address user, uint256 week) public view returns (bool)',
        'function getAllCheckIns(address user) external view returns (bool[52] memory)',
        'function paused() public view returns (bool)',
        'event CheckIn(address indexed user, uint256 indexed week, uint256 timestamp)'
    ];

    // ============ State ============

    let provider = null;
    let signer = null;
    let contract = null;
    let userAddress = null;
    let currentWeek = 1;

    // ============ DOM Elements ============

    const states = {
        notConnected: document.getElementById('stateNotConnected'),
        connected: document.getElementById('stateConnected'),
        checking: document.getElementById('stateChecking'),
        success: document.getElementById('stateSuccess'),
        already: document.getElementById('stateAlready'),
        error: document.getElementById('stateError'),
        wrongNetwork: document.getElementById('stateWrongNetwork')
    };

    const elements = {
        btnConnect: document.getElementById('btnConnect'),
        btnDisconnect: document.getElementById('btnDisconnect'),
        btnCheckIn: document.getElementById('btnCheckIn'),
        btnRetry: document.getElementById('btnRetry'),
        btnSwitchNetwork: document.getElementById('btnSwitchNetwork'),
        walletAddress: document.getElementById('walletAddress'),
        checkinWeek: document.getElementById('checkinWeek'),
        successWeek: document.getElementById('successWeek'),
        alreadyWeek: document.getElementById('alreadyWeek'),
        txLink: document.getElementById('txLink'),
        errorMessage: document.getElementById('errorMessage')
    };

    // ============ UI State Management ============

    function showState(stateName) {
        Object.keys(states).forEach(key => {
            if (states[key]) {
                states[key].style.display = key === stateName ? 'flex' : 'none';
            }
        });
    }

    function formatAddress(address) {
        return address.slice(0, 6) + '...' + address.slice(-4);
    }

    function updateWeekDisplay() {
        // For demo purposes, calculate week (in production, get from contract)
        const now = new Date();
        const year = now.getFullYear();

        if (year < 2026) {
            currentWeek = 1; // Default to week 1 before 2026
        } else if (year > 2026) {
            currentWeek = 52;
        } else {
            const startOf2026 = new Date(2026, 0, 1);
            const diffMs = now - startOf2026;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            currentWeek = Math.min(Math.floor(diffDays / 7) + 1, 52);
        }

        if (elements.checkinWeek) elements.checkinWeek.textContent = currentWeek;
        if (elements.successWeek) elements.successWeek.textContent = currentWeek;
        if (elements.alreadyWeek) elements.alreadyWeek.textContent = currentWeek;
    }

    // ============ Wallet Functions ============

    async function checkWalletAvailable() {
        return typeof window.ethereum !== 'undefined';
    }

    async function connectWallet() {
        if (!await checkWalletAvailable()) {
            showError('No wallet found. Please install Coinbase Wallet or MetaMask.');
            return;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                showError('No accounts found. Please unlock your wallet.');
                return;
            }

            userAddress = accounts[0];

            // Check network
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });

            if (chainId !== BASE_CHAIN_ID) {
                showState('wrongNetwork');
                return;
            }

            // Setup ethers
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();

            // Setup contract if address is configured
            if (CONTRACT_ADDRESS) {
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                await checkIfAlreadyCheckedIn();
            } else {
                // Demo mode - no contract deployed yet
                showConnectedState();
            }

        } catch (error) {
            console.error('Connection error:', error);
            showError('Failed to connect wallet. Please try again.');
        }
    }

    async function disconnectWallet() {
        provider = null;
        signer = null;
        contract = null;
        userAddress = null;
        showState('notConnected');
    }

    async function switchToBase() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID }]
            });

            // Reconnect after switching
            await connectWallet();

        } catch (switchError) {
            // Chain not added, try to add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BASE_CHAIN_CONFIG]
                    });
                    await connectWallet();
                } catch (addError) {
                    showError('Failed to add Base network. Please add it manually.');
                }
            } else {
                showError('Failed to switch network. Please switch manually.');
            }
        }
    }

    // ============ Contract Functions ============

    async function checkIfAlreadyCheckedIn() {
        if (!contract || !userAddress) {
            showConnectedState();
            return;
        }

        try {
            const checked = await contract.hasCheckedIn(userAddress, currentWeek);

            if (checked) {
                showState('already');
            } else {
                showConnectedState();
            }
        } catch (error) {
            console.error('Error checking status:', error);
            // Might fail if not 2026 yet - show connected state anyway
            showConnectedState();
        }
    }

    function showConnectedState() {
        if (elements.walletAddress) {
            elements.walletAddress.textContent = formatAddress(userAddress);
        }
        showState('connected');
    }

    async function checkIn() {
        if (!contract) {
            showError('Contract not configured. Please try again later.');
            return;
        }

        showState('checking');

        try {
            // Send the transaction
            const tx = await contract.checkIn();

            // Wait for confirmation
            const receipt = await tx.wait();

            // Success!
            if (elements.txLink) {
                elements.txLink.href = `https://basescan.org/tx/${receipt.hash}`;
            }
            showState('success');

        } catch (error) {
            console.error('Check-in error:', error);

            // Parse error message
            let message = 'Transaction failed. Please try again.';

            if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
                message = 'Transaction cancelled.';
            } else if (error.message?.includes('NotYet2026')) {
                message = 'Check-ins start January 1, 2026.';
            } else if (error.message?.includes('Year2026Ended')) {
                message = 'Bloom 2026 has ended.';
            } else if (error.message?.includes('AlreadyCheckedIn')) {
                showState('already');
                return;
            } else if (error.message?.includes('ContractPaused')) {
                message = 'Check-ins are temporarily paused.';
            }

            showError(message);
        }
    }

    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
        }
        showState('error');
    }

    // ============ Event Listeners ============

    function setupEventListeners() {
        // Connect button
        if (elements.btnConnect) {
            elements.btnConnect.addEventListener('click', connectWallet);
        }

        // Disconnect button
        if (elements.btnDisconnect) {
            elements.btnDisconnect.addEventListener('click', disconnectWallet);
        }

        // Check-in button
        if (elements.btnCheckIn) {
            elements.btnCheckIn.addEventListener('click', checkIn);
        }

        // Retry button
        if (elements.btnRetry) {
            elements.btnRetry.addEventListener('click', () => {
                if (userAddress) {
                    showConnectedState();
                } else {
                    showState('notConnected');
                }
            });
        }

        // Switch network button
        if (elements.btnSwitchNetwork) {
            elements.btnSwitchNetwork.addEventListener('click', switchToBase);
        }

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    disconnectWallet();
                } else {
                    userAddress = accounts[0];
                    connectWallet();
                }
            });

            // Listen for network changes
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }

    // ============ Initialize ============

    function init() {
        updateWeekDisplay();
        setupEventListeners();
        showState('notConnected');

        // Check if already connected
        if (window.ethereum && window.ethereum.selectedAddress) {
            connectWallet();
        }
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
