import { HasMimeType, IsFile, MemoryStoredFile } from 'nestjs-form-data';

/** Typedef class for file transfer */
export class CreateModelDto {
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
