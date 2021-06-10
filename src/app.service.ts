import { Injectable, Logger } from '@nestjs/common';
import { GridFSBucket, GridFSBucketReadStream, MongoClient } from 'mongodb';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';

@Injectable()
export class FilesService {
	private mongoClient: MongoClient;
	private gridFS: GridFSBucket;

	constructor(private readonly logger: Logger) {
		this.logger = new Logger('Bin Handler');
		if (typeof process.env.MONGODB_URL === 'undefined') {
			this.logger.log('MongoDB URL undefined');
			throw new Error();
		} else {
			MongoClient.connect(process.env.MONGODB_URL, { useUnifiedTopology: true }).then((client) => {
				this.mongoClient = client;
				const audioDb = client.db('files');
				this.gridFS = new GridFSBucket(audioDb);
			});
		}
	}

	public async saveModel(id: string, name: string, textureName: string, model: Model): Promise<SaveFilesResponse> {
		const gltfId = uuid(),
			binId = uuid(),
			textureId = uuid();
		const modelFile: ModelFile = { _id: id, gltf: gltfId, bin: binId, texture: textureId, name };
		await this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.insertOne(modelFile);
		await this.saveFile(gltfId, `${name}.gltf`, model.gltf);
		await this.saveFile(binId, `${name}.bin`, model.bin);
		await this.saveFile(textureId, `${textureName}`, model.texture);

		return {
			gltf: gltfId,
			bin: binId,
			texture: textureId,
			link: `http://localhost:3000/view/${id}`
		};
	}

	public async getMetadataById(id: string): Promise<ModelFile | null> {
		return this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOne({ _id: id });
	}

	public async getMetadataByName(name: string): Promise<ModelFile | null> {
		return this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOne({ name });
	}

	public async saveFile(id: string, name: string, data: Readable): Promise<void> {
		const uploadStream = this.gridFS.openUploadStreamWithId(id, name);
		data.pipe(uploadStream);

		return new Promise((resolve) => {
			uploadStream.on('close', resolve);
			uploadStream.on('finish', resolve);
		});
	}

	public getFile(name: string): GridFSBucketReadStream {
		return this.gridFS.openDownloadStreamByName(name);
	}
}
