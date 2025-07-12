export async function getClientApi():Promise<getPortalCliApiResponse> {
    try {
    const res = await fetch('/api/portal/client', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error desconocido');
    }

    const data = await res.json();    
    console.log('cli creado', data);
    return data;
  } catch (error) {
    console.error('Error al crear cli', error);
    throw error;
  }
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