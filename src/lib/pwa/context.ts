export const PWA_CONTEXT = Symbol('pwa');

export type PwaState = {
	online: boolean;
	installed: boolean;
	canInstall: boolean;
	offlineReady: boolean;
	updateReady: boolean;
	updating: boolean;
	error: string;
	install: () => Promise<void>;
	update: () => void;
};

export function initialPwaState(): PwaState {
	return {
		online: true,
		installed: false,
		canInstall: false,
		offlineReady: false,
		updateReady: false,
		updating: false,
		error: '',
		install: async () => {},
		update: () => {}
	};
}
