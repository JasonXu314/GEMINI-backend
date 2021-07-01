import { Injectable, Logger } from '@nestjs/common';
import { GridFSBucket, GridFSBucketReadStream, MongoClient } from 'mongodb';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';

/** Service for interacting with DB */
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
				process.on('SIGTERM', async () => {
					await this.mongoClient.close();
				});
			});
		}
	}

	/**
	 * Checks to see if a model with name ``name`` already exists or not
	 * @param name model name
	 * @returns whether the model is already in the db or not
	 */
	public async modelExists(name: string): Promise<boolean> {
		return (await this.mongoClient.db('files').collection<ModelFile>('metadata').find({ name }).count()) > 0;
	}

	/**
	 * Checks to see if a model with id ``_id`` already exists or not
	 * @param _id model id
	 * @returns whether the model is already in the db or not
	 */
	public async modelExistsId(_id: string): Promise<boolean> {
		return (await this.mongoClient.db('files').collection<ModelFile>('metadata').find({ _id }).count()) > 0;
	}

	/**
	 * Saves a model into the db
	 * @param name the model name
	 * @param model the files to save as the model
	 * @param modelData other model metadata to consider
	 * @returns the response to the client
	 */
	public async saveModel(name: string, model: Model, modelData: ModelData): Promise<SaveFilesResponse> {
		const _id = uuid(),
			gltfId = uuid(),
			binId = uuid(),
			structId = uuid(),
			epiId = uuid(),
			grefId = uuid(),
			textureIds = new Array(model.textures.length).fill(null).map(() => uuid());
		const modelFile: ModelFile = { _id, gltf: gltfId, bin: binId, textures: textureIds, name, modelData };
		await this.saveFile(gltfId, `${name}.gltf`, model.gltf);
		await this.saveFile(binId, `${name}.bin`, model.bin);
		await Promise.all(model.textures.map((texture, i) => this.saveFile(textureIds[i], texture.name, texture.stream)));
		await this.saveFile(structId, `${_id}.struct`, model.structure);
		await this.saveFile(epiId, `${_id}.epi`, model.epiData);
		await this.saveFile(grefId, `${_id}.gref`, model.refGenes);
		await this.mongoClient.db('files').collection<ModelFile>('metadata').insertOne(modelFile);

		return {
			gltf: gltfId,
			bin: binId,
			structure: structId,
			epiData: epiId,
			refGenes: grefId,
			textures: textureIds,
			link: `http://localhost:3000/view/${_id}`
		};
	}

	/**
	 * Gets the metadata for the model of id ``id``
	 * @param id the id of the model
	 * @returns the model metadata
	 */
	public async getMetadataById(id: string): Promise<ModelFile | null> {
		return this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ _id: id });
	}

	/**
	 * Geets the metadata for th emodel of name ``name``
	 * @param name the name of the model
	 * @returns the model metadata
	 */
	public async getMetadataByName(name: string): Promise<ModelFile | null> {
		return this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ name });
	}

	/**
	 * Helper function to write a file to db (probably should be private)
	 * @param id the id of the file
	 * @param name the name of the file
	 * @param data the data (as a stream) of the file
	 * @returns a promise that resolves when the file is finished being written to db
	 */
	public async saveFile(id: string, name: string, data: Readable): Promise<void> {
		const uploadStream = this.gridFS.openUploadStreamWithId(id, name);
		data.pipe(uploadStream);

		return new Promise((resolve) => {
			uploadStream.on('close', resolve);
			uploadStream.on('finish', resolve);
		});
	}

	/**
	 * Fetches a file from the db
	 * @param name name of the file
	 * @returns the data (as a stream) of the file
	 */
	public getFile(name: string): GridFSBucketReadStream {
		return this.gridFS.openDownloadStreamByName(name);
	}

	/**
	 * Checks whether a file with the given name exists
	 * @param name name of the file
	 * @returns whether the file exists or not
	 */
	public async fileExists(name: string): Promise<boolean> {
		return (await this.gridFS.find({ filename: name }).count()) > 0;
	}
}
