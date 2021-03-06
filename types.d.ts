type Readable = import('stream').Readable;

type IncomingSocketMsgs =
	| LinkMsg
	| StartLiveMsg
	| JoinLiveMsg
	| LeaveLiveMsg
	| EndLiveMsg
	| CamChangeMsg
	| MeshSelectMsg
	| TransferControlMsg
	| RevertControlMsg
	| RequestControlMsg
	| RadiusSelectStartMsg
	| RadiusParamChangeMsg
	| RadiusSetMsg
	| RadiusResetMsg
	| ExecuteSelectorsMsg
	| ClearSelectorsMsg
	| VolumeParamChangeMsg
	| VolumeSetMsg
	| VolumeResetMsg
	| VolumeSelectStartMsg
	| VolumeCancelMsg
	| RadiusCancelMsg
	| BPSParamChangeMsg
	| BPSSetMsg
	| BPSResetMsg
	| RecallSortMsg;
type OutgoingSocketMsgs =
	| HistAddMsg
	| HistDelMsg
	| HistEditMsg
	| AnnAddMsg
	| AnnDelMsg
	| OutboundJoinLiveMsg
	| OutboundLeaveLiveMsg
	| OutboundStartLiveMsg
	| CamChangeMsg
	| EndLiveMsg
	| MeshSelectMsg
	| TransferControlMsg
	| OutboundRequestControlMsg
	| ViewAddMsg
	| ViewDelMsg
	| ViewEditMsg
	| ViewDelMsg
	| HighlightAddMsg
	| HighlightEditMsg
	| HighlightColorMsg
	| HighlightDelMsg
	| RadiusSelectStartMsg
	| RadiusParamChangeMsg
	| RadiusSetMsg
	| RadiusResetMsg
	| ExecuteSelectorsMsg
	| ClearSelectorsMsg
	| VolumeParamChangeMsg
	| VolumeSetMsg
	| VolumeResetMsg
	| VolumeSelectStartMsg
	| VolumeCancelMsg
	| RadiusCancelMsg
	| BPSParamChangeMsg
	| BPSSetMsg
	| BPSResetMsg
	| RecallSortMsg;
type RawHighlight = RadiusHighlight | VolumeHighlight;

type RecursivePartial<T> = { [K in keyof T]?: RecursivePartial<T[K]> };

interface SaveFilesResponse {
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
	modelData: ModelData;
	sortHist: Sort[];
	annotations: RawAnnotation[];
	highlights: RawHighlight[];
	views: View[];
	live: boolean;
	session: null | LiveSessionData;
}

interface Sort {
	_id: string;
	name: string;
	radSelect: RadSelectParams | null;
	volSelect: VolSelectParams | null;
	bpsSelect: BPSParams | null;
}

interface RadSelectParams {
	position: RawVector3;
	radius: number;
}

interface VolSelectParams {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	minZ: number;
	maxZ: number;
}

interface BPSParams {
	regions: string;
	radius: number;
}

interface Model {
	structure: Readable;
	epiData: Readable;
	refGenes: Readable;
}

interface RawVector3 {
	x: number;
	y: number;
	z: number;
}

interface RawColor3 {
	r: number;
	g: number;
	b: number;
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

interface RawAnnotation {
	mesh: string;
	text: string;
}

interface AssignedId {
	id: string;
	roomId: string;
	expiration: NodeJS.Timeout;
}

interface SocketMsg {
	type: string;
}

interface LinkMsg extends SocketMsg {
	type: 'LINK';
	id: string;
	roomId: string;
}

interface HistAddMsg extends SocketMsg {
	type: 'HIST_ADD';
	newSort: Sort;
}

interface HistDelMsg extends SocketMsg {
	type: 'HIST_DEL';
	id: string;
}

interface HistEditMsg extends SocketMsg {
	type: 'HIST_EDIT';
	id: string;
	name: string;
}

interface HighlightAddMsg extends SocketMsg {
	type: 'HIGHLIGHT_ADD';
	newHighlight: RawHighlight;
}

interface HighlightEditMsg extends SocketMsg {
	type: 'HIGHLIGHT_EDIT';
	id: string;
	name: string;
}

interface HighlightColorMsg extends SocketMsg {
	type: 'HIGHLIGHT_COLOR';
	id: string;
	color: RawColor3;
}

interface HighlightDelMsg extends SocketMsg {
	type: 'HIGHLIGHT_DEL';
	id: string;
}

interface ViewAddMsg extends SocketMsg {
	type: 'VIEW_ADD';
	newView: View;
}

interface ViewDelMsg extends SocketMsg {
	type: 'VIEW_DEL';
	id: string;
}

interface ViewEditMsg extends SocketMsg {
	type: 'VIEW_EDIT';
	id: string;
	name: string;
}

interface ViewDelMsg extends SocketMsg {
	type: 'VIEW_DEL';
	id: string;
}

interface AnnAddMsg extends SocketMsg {
	type: 'ANN_ADD';
	newAnnotation: RawAnnotation;
}

interface AnnDelMsg extends SocketMsg {
	type: 'ANN_DEL';
	mesh: string;
}

interface StartLiveMsg extends SocketMsg {
	type: 'START_LIVE';
	camPos: RawVector3;
	camRot: RawVector3;
	name: string;
}
interface JoinLiveMsg extends SocketMsg {
	type: 'JOIN_LIVE';
	name: string;
}
interface LeaveLiveMsg extends SocketMsg {
	type: 'LEAVE_LIVE';
}
interface EndLiveMsg extends SocketMsg {
	type: 'END_LIVE';
}
interface CamChangeMsg extends SocketMsg {
	type: 'CAM_CHANGE';
	camPos: RawVector3;
	camRot: RawVector3;
}

interface MeshSelectMsg extends SocketMsg {
	type: 'SELECT_MESH';
	mesh: string;
}

interface TransferControlMsg extends SocketMsg {
	type: 'TRANSFER_CONTROL';
	id: string;
}

interface RevertControlMsg extends SocketMsg {
	type: 'REVERT_CONTROL';
}

interface RequestControlMsg extends SocketMsg {
	type: 'REQUEST_CONTROL';
	id: string;
}

interface OutboundRequestControlMsg extends SocketMsg {
	type: 'REQUEST_CONTROL';
	id: string;
	name: string;
}

interface OutboundStartLiveMsg extends SocketMsg {
	type: 'START_LIVE';
	data: LiveSessionData;
}

interface OutboundJoinLiveMsg extends SocketMsg {
	type: 'JOIN_LIVE';
	id: string;
	name: string;
}

interface OutboundLeaveLiveMsg extends SocketMsg {
	type: 'LEAVE_LIVE';
	id: string;
}

type RadiusParamChangeMsg = { type: 'RADIUS_PARAM_CHANGE' } & RecursivePartial<RadSelectParams>;
type VolumeParamChangeMsg = { type: 'VOLUME_PARAM_CHANGE' } & RecursivePartial<VolSelectParams>;
type BPSParamChangeMsg = { type: 'BPS_PARAM_CHANGE' } & RecursivePartial<BPSParams>;

interface RadiusSelectStartMsg extends SocketMsg {
	type: 'RADIUS_START';
}

interface VolumeSetMsg {
	type: 'VOLUME_SET';
}

interface VolumeResetMsg {
	type: 'VOLUME_RESET';
}

interface VolumeCancelMsg {
	type: 'VOLUME_CANCEL';
}

interface VolumeSelectStartMsg extends SocketMsg {
	type: 'VOLUME_START';
}

interface BPSSetMsg {
	type: 'BPS_SET';
}

interface BPSResetMsg {
	type: 'BPS_RESET';
}

interface RecallSortMsg {
	type: 'RECALL_SORT';
	sort: Sort;
}

interface RadiusSetMsg {
	type: 'RADIUS_SET';
}

interface RadiusResetMsg {
	type: 'RADIUS_RESET';
}

interface RadiusCancelMsg {
	type: 'RADIUS_CANCEL';
}

interface ExecuteSelectorsMsg {
	type: 'EXECUTE_SELECTORS';
}

interface ClearSelectorsMsg {
	type: 'CLEAR_SELECTORS';
}

interface LiveParticipant {
	id: string;
	name: string;
}

interface LiveSessionData {
	hostID: string;
	controllerID: string;
	camPos: RawVector3;
	camRot: RawVector3;
	participants: LiveParticipant[];
}

interface View {
	_id: string;
	name: string;
	pos: RawVector3;
	rot: RawVector3;
}

interface RadiusHighlight {
	id: string;
	name: string;
	params: RadSelectParams;
	type: 'radius';
	color: RawColor3;
}

interface VolumeHighlight {
	id: string;
	name: string;
	params: VolSelectParams;
	type: 'volume';
	color: RawColor3;
}
