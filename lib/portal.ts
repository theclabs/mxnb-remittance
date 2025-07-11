import Portal, { BackupMethods } from "@portal-hq/web"

let portalInstance: Portal | null = null

export function getPortal(): Portal {
  if (!portalInstance) {
    portalInstance = new Portal({
      apiKey: process.env.NEXT_PUBLIC_PORTAL_API_KEY!,
      rpcConfig: {
        'eip155:421614': process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      },
    })
  }
  return portalInstance
}

export function getPortalMPC(): Portal {
  if (!portalInstance) {
    portalInstance = new Portal({
      apiKey: process.env.NEXT_PUBLIC_PORTAL_API_KEY!,
      rpcConfig: {
        'eip155:421614': process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      },
      keychain : BackupMethods,
    })
  }
  return portalInstance
}

export async function connectWallet() {
  const portal = getPortal();

  return new Promise((resolve, reject) => {
    try {
      portal.onReady(async () => {
        try {
          const walletExists = await portal.doesWalletExist();
          if (!walletExists) {
            await portal.createWallet();
          }

          const address = await portal.getEip155Address();
          const balance = await portal.getAssets('eip155:421614');
          console.log(address);
          console.log(balance);

          resolve({
            address,
            balance: balance.toString(),
            connected: true,
          });
        } catch (innerError) {
          console.error("Failed inside onReady:", innerError);
          reject(innerError);
        }
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      reject(error);
    }
  });
}

export async function connectWallet2() {
  const portal = getPortalMPC();

  return new Promise((resolve, reject) => {
    const backupStorage = new LocalStorageBackup();
    try {
      portal.onReady(async () => {
        try {
          const session =   await portal.mpc.generate({
                                host: 'https://mpc-api.portal.network',
                                mpcVersion: 'v1',
                            });
        console.log(session)
        const back = await portal.mpc.backup({
            backupMethod: backupStorage
        })
          resolve({
            address,
            balance: balance.toString(),
            connected: true,
          });
        } catch (innerError) {
          console.error("Failed inside onReady:", innerError);
          reject(innerError);
        }
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      reject(error);
    }
  });
}

export async function backUp() {
  const portal = getPortal();
    try {
        await portal.backupWallet(BackupMethods.passkey)
    } catch (error) {
      console.error("Failed to backup wallet:", error);
    }
}


export async function sendETH(to: string, amount: string) {
  const portal = getPortal()

  try {
    const tx = await portal.sendAsset('eip155:421614', {
        to,
        amount,
        token : 'native'
    })

    return tx
  } catch (error) {
    console.error("Failed to send ETH:", error)
    throw error
  }
}

export async function getETHBalance(): Promise<string> {
  const portal = getPortal()

  try {
    const balance = await portal.getAssets('eip155:421614')
    return balance.toString()
  } catch (error) {
    console.error("Failed to get balance:", error)
    return "0"
  }
}

export async function disconnectWallet() {
  const portal = getPortal()
  //await portal.eject()
}



class LocalStorageBackup {
  private storageKey = 'portal_mpc_backup';

  async upload(cipherText: string): Promise<void> {
    localStorage.setItem(this.storageKey, cipherText);
  }

  async download(): Promise<string> {
    const data = localStorage.getItem(this.storageKey);
    if (!data) throw new Error('No backup found in localStorage');
    return data;
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }
}

async function main() {
  const backupStorage = new LocalStorageBackup();

  portal.mpc.backup()

  // 1️⃣ Crear wallet MPC (o cargar si existe)
  await portal.mpc.generate({
    host: 'https://mpc-api.portal.network',
    mpcVersion: 'v1',
  });

  // 2️⃣ Hacer backup de la wallet en localStorage
  await portal.mpc.backup('localStorage');

  // 3️⃣ Mostrar dirección y saldo (en ETH)
  console.log('Dirección MPC:', portal.address);

  // Obtener balances vía provider
  const balanceHex = await portal.provider.request({
    method: 'eth_getBalance',
    params: [portal.address, 'latest'],
  });

  // Convertir hex a decimal ETH
  const balanceEth = par
}