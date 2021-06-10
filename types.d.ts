type Readable = import('stream').Readable;

interface SaveFilesPost {
	gltf: [Express.Multer.File];
	bin: [Express.Multer.File];
	texture: [Express.Multer.File];
}

interface SaveFilesResponse {
	gltf: string;
	bin: string;
	texture: string;
	link: string;
}

interface ModelFile {
	_id: string;
	name: string;
	gltf: string;
	bin: string;
	texture: string;
}

interface Model {
	gltf: Readable;
	bin: Readable;
	texture: Readable;
}
