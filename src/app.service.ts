import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	private gltf: string = '';
	private bin: Uint8Array | null = null;

	public getGltf(): string {
		return this.gltf;
	}

	public getBin(): Uint8Array | null {
		return this.bin;
	}

	public setGltf(gltf: string): void {
		this.gltf = gltf;
	}

	public setBin(bin: number[]): void {
		this.bin = Uint8Array.from(bin);
	}
}
