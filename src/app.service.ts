import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { GridFSBucket, GridFSBucketReadStream, MongoClient } from 'mongodb';
import { launch } from 'puppeteer';
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
				const filesDb = client.db('files');
				this.gridFS = new GridFSBucket(filesDb);
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

	public async getAllModels(): Promise<ModelFile[]> {
		return this.mongoClient.db('files').collection<ModelFile>('metadata').find({}).toArray();
	}

	/**
	 * Saves a model into the db
	 * @param name the model name
	 * @param model the files to save as the model
	 * @param modelData other model metadata to consider
	 * @returns the response to the client
	 */
	public async saveModel(name: string, model: Model, modelData: ModelData, annotations: RawAnnotation[]): Promise<SaveFilesResponse> {
		const _id = uuid(),
			structId = uuid(),
			epiId = uuid(),
			grefId = uuid();
		this.logger.log(`Saving model with name ${name} and id ${_id}`);
		const modelFile: ModelFile = { _id, name, modelData, sortHist: [], annotations };
		await this.saveFile(structId, `${_id}.struct`, model.structure);
		await this.saveFile(epiId, `${_id}.epi`, model.epiData);
		await this.saveFile(grefId, `${_id}.gref`, model.refGenes);
		await this.mongoClient.db('files').collection<ModelFile>('metadata').insertOne(modelFile);

		launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] }).then((browser) => {
			this.logger.log('Making preview');
			browser.newPage().then(async (page) => {
				this.logger.log('Loaded Page');
				await page.goto(`${process.env.VIEW_BASE_URL}/preview/${_id}`);
				await new Promise((resolve) => setTimeout(resolve, 5000));
				const sc = (await page.screenshot()) as Buffer;
				this.logger.log('Created Preview, saving...');

				this.saveFile(uuid(), `${_id}-preview.png`, Readable.from(sc));
				this.logger.log(`Saved Preview with id ${_id}`);
				await browser.close();
			});
		});

		return {
			structure: structId,
			epiData: epiId,
			refGenes: grefId,
			link: `${process.env.VIEW_BASE_URL}/share/${_id}`
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

	/**
	 * Gets the sorts of the given model
	 * @param _id the id of the model
	 * @returns the sorts on the model of id _id
	 */
	public async getSorts(_id: string): Promise<Sort[]> {
		const sorts = (await this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ _id }))?.sortHist;

		if (!sorts) {
			throw new NotFoundException(`Model with id ${_id} does not exist`);
		}

		return sorts;
	}

	/**
	 * Appends a sort onto the history of the model with id _id
	 * @param _id the id of the model to modify
	 * @param newSort the sort to add
	 * @returns the new sort history
	 */
	public async addSort(_id: string, newSort: Sort): Promise<Sort[]> {
		const res = await this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOneAndUpdate({ _id }, { $push: { sortHist: newSort } });

		if (res.ok) {
			return [...res.value!.sortHist, newSort];
		} else {
			throw new InternalServerErrorException('DB Failed to update');
		}
	}

	/**
	 * Renames a sort to the given name
	 * @param _id the id of the model to modify
	 * @param id the id of the sort to rename
	 * @param name the new name of the sort
	 * @returns the new sorts after the rename
	 */
	public async renameSort(_id: string, id: string, name: string): Promise<Sort[]> {
		const currHist = (await this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ _id }))?.sortHist;

		if (!currHist) {
			throw new NotFoundException(`Model with id ${_id} does not exist`);
		}

		const currSort = currHist.find((sort) => sort._id === id);

		if (!currSort) {
			throw new NotFoundException(`Sort with id ${id} does not exist on model with id ${_id}`);
		}

		currSort.name = name;

		await this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOneAndUpdate({ _id }, { $set: { sortHist: currHist } });
		return currHist;
	}

	/**
	 * Deletes a given sort
	 * @param _id the id of the model to modify
	 * @param id the id of the sort to delete
	 * @returns the new sorts after the deletion
	 */
	public async deleteSort(_id: string, id: string): Promise<Sort[]> {
		const currHist = (await this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ _id }))?.sortHist;

		if (!currHist) {
			throw new NotFoundException(`Model with id ${_id} does not exist`);
		}

		const newHist = currHist.filter((sort) => sort._id !== id);

		await this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOneAndUpdate({ _id }, { $set: { sortHist: newHist } });
		return newHist;
	}

	public async getAnnotations(_id: string): Promise<RawAnnotation[]> {
		const annotations = (await this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ _id }))?.annotations;

		if (!annotations) {
			throw new NotFoundException(`Model with id ${_id} does not exist`);
		}

		return annotations;
	}

	public async addAnnotation(_id: string, annotation: RawAnnotation): Promise<RawAnnotation[]> {
		const res = await this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOneAndUpdate({ _id }, { $push: { annotations: annotation } });

		if (res.ok) {
			return [...res.value!.annotations, annotation];
		} else {
			throw new InternalServerErrorException('DB Failed to update');
		}
	}

	public async removeAnnotation(_id: string, name: string): Promise<RawAnnotation[]> {
		const currAnns = (await this.mongoClient.db('files').collection<ModelFile>('metadata').findOne({ _id }))?.annotations;

		if (!currAnns) {
			throw new NotFoundException(`Model with id ${_id} does not exist`);
		}

		const newAnns = currAnns.filter((ann) => ann.mesh !== name);

		await this.mongoClient
			.db('files')
			.collection<ModelFile>('metadata')
			.findOneAndUpdate({ _id }, { $set: { annotations: newAnns } });
		return newAnns;
	}
}
