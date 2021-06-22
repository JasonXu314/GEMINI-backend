type Readable = import('stream').Readable;

interface SaveFilesResponse {
	gltf: string;
	bin: string;
	textures: string[];
	structure: string;
	epiData: string;
	refGenes: string;
	link: string;
}

interface ModelData {
	viewRegion: ViewRegion;
	flagsVisible: boolean;
	arcsVisible: boolean;
}

interface ModelFile {
	_id: string;
	name: string;
	gltf: string;
	bin: string;
	textures: string[];
	modelData: ModelData;
}

interface Model {
	gltf: Readable;
	bin: Readable;
	structure: Readable;
	epiData: Readable;
	refGenes: Readable;
	textures: Texture[];
}

interface Texture {
	stream: Readable;
	name: string;
}

interface RawVector3 {
	x: number;
	y: number;
	z: number;
}

interface RawStructureCoord extends RawVector3 {
	compartment: string;
	type: string;
	tag: number;
}

interface Locus {
	start: number;
	end: number;
	chr: `chr${number}`;
}

interface RawFlagTrackData {
	id: number;
	locus: Locus;
	startPos: RawVector3;
	startTag: number;
	stopPos: RawVector3;
	stopTag: number;
	strand: string;
	value: number;
}

interface RawArcTrackData {
	id: number;
	locus1: Locus;
	locus2: Locus;
	score: number;
	startPos1: RawVector3;
	startPos2: RawVector3;
	startTag1: number;
	startTag2: number;
	stopPos1: RawVector3;
	stopPos2: RawVector3;
	stopTag1: number;
	stopTag2: number;
}

interface RawEpiData {
	arcs: RawArcTrackData[];
	flags: RawFlagTrackData[];
}

interface ViewRegion {
	genomeStart: number;
	start: number;
	stop: number;
	length: number;
	chrLength: number;
	chr: number;
}
