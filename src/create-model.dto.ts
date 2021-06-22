import { HasMimeType, IsFile, IsFiles, MemoryStoredFile } from 'nestjs-form-data';

export class CreateModelDto {
	@IsFile({ message: 'gltf property must be a glTF file' })
	@HasMimeType(['model/gltf+json'], { message: 'glTF file is not of correct format, must be model/gltf+json' })
	gltf: MemoryStoredFile;

	@IsFile({ message: 'bin property must be a bin file' })
	@HasMimeType(['application/octet-stream'], { message: 'bin file is not of correct format, must be application/octet-stream' })
	bin: MemoryStoredFile;

	@IsFiles({ each: true, message: 'textures property must be an array of PNG files' })
	@HasMimeType(['image/png'], { each: true, message: 'one or more texture files is not of correct format, must be image/png' })
	textures: MemoryStoredFile[];

	@IsFile({ message: 'structure property must be a struct file' })
	@HasMimeType(['application/octet-stream'], { message: 'struct file is not of correct format, must be application/octet-stream' })
	structure: MemoryStoredFile;

	@IsFile({ message: 'epiData property must be a epi file' })
	@HasMimeType(['application/octet-stream'], { message: 'epi file is not of correct format, must be application/octet-stream' })
	epiData: MemoryStoredFile;

	@IsFile({ message: 'refGenes property must be a gref file' })
	@HasMimeType(['application/octet-stream'], { message: 'gref file is not of correct format, must be application/octet-stream' })
	refGenes: MemoryStoredFile;

	viewRegion: string;
	flagsVisible: boolean;
	arcsVisible: boolean;
}
