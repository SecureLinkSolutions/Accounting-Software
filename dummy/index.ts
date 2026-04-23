import type { Fyo } from 'fyo';

export async function setupDummyInstance(
  _filePath: string,
  _fyo: Fyo,
  _seed: number,
  _baseCount: number,
  onProgress?: (message: string, percent: number) => void
): Promise<void> {
  onProgress?.('Setting up demo company...', 50);
  onProgress?.('Done', 100);
}
