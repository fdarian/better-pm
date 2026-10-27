import { t as settings } from './astro_runtime_client_dev-toolbar_entrypoint__js.js';

// ../../../../../Library/pnpm/store/v11/links/@/astro/7.4.2/a8ff2ee0a7862b8a9ab6960f80fd9cd2bd773e1122627d2c267f99357d4ea446/node_modules/astro/dist/runtime/client/dev-toolbar/apps/utils/window.js
function createWindowElement(content, placement = settings.config.placement) {
	const windowElement = document.createElement('astro-dev-toolbar-window');
	windowElement.innerHTML = content;
	windowElement.placement = placement;
	return windowElement;
}
function closeOnOutsideClick(eventTarget, additionalCheck) {
	function onPageClick(event) {
		const target = event.target;
		if (!target) return;
		if (!target.closest) return;
		if (target.closest('astro-dev-toolbar')) return;
		if (additionalCheck && additionalCheck(target)) return;
		eventTarget.dispatchEvent(
			new CustomEvent('toggle-app', { detail: { state: false } }),
		);
	}
	eventTarget.addEventListener('app-toggled', (event) => {
		if (event.detail.state === true)
			document.addEventListener('click', onPageClick, true);
		else document.removeEventListener('click', onPageClick, true);
	});
}
function synchronizePlacementOnUpdate(eventTarget, canvas) {
	eventTarget.addEventListener('placement-updated', (evt) => {
		if (!(evt instanceof CustomEvent)) return;
		const windowElement = canvas.querySelector('astro-dev-toolbar-window');
		if (!windowElement) return;
		windowElement.placement = evt.detail.placement;
	});
}

export {
	closeOnOutsideClick as t,
	createWindowElement as n,
	synchronizePlacementOnUpdate as r,
};
