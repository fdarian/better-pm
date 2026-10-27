import { t as require_client } from './client-DgMRt-T1.js';
import { t as require_react } from './react-DuSsLd0b.js';

// ../../../../../Library/pnpm/store/v11/links/@astrojs/react/7.1.1/099768f03525363c887248a173242aac15ac1de3d49ff70d1e1dd3fe04dc87a0/node_modules/@astrojs/react/dist/static-html.js
var import_client = require_client();
var import_react = require_react();
/**
 * Astro passes `children` as a string of HTML, so we need
 * a wrapper `div` to render that content as VNodes.
 *
 * As a bonus, we can signal to React that this subtree is
 * entirely static and will never change via `shouldComponentUpdate`.
 */
var StaticHtml = ({ value, name, hydrate = true }) => {
	if (value == null || value.trim() === '') return null;
	return (0, import_react.createElement)(
		hydrate ? 'astro-slot' : 'astro-static-slot',
		{
			name,
			suppressHydrationWarning: true,
			dangerouslySetInnerHTML: { __html: value },
		},
	);
};
/**
 * React.memo is the modern functional equivalent of shouldComponentUpdate.
 *
 * By returning `true` in the comparison function (the second argument),
 * we tell React that the props are "equal" and it should skip re-rendering,
 * effectively making this subtree static.
 */
var static_html_default = (0, import_react.memo)(StaticHtml, () => true);
// ../../../../../Library/pnpm/store/v11/links/@astrojs/react/7.1.1/099768f03525363c887248a173242aac15ac1de3d49ff70d1e1dd3fe04dc87a0/node_modules/@astrojs/react/dist/client.js
function isAlreadyHydrated(element) {
	for (const key in element) if (key.startsWith('__reactContainer')) return key;
}
var reactPropsMap = {
	class: 'className',
	for: 'htmlFor',
};
var clientIds = 0;
function createReactElementFromDOMElement(element, id, key) {
	if (id === void 0) {
		clientIds += 1;
		id = clientIds;
		key = 0;
	}
	const attrs = {};
	for (const attr of element.attributes) {
		const propName = reactPropsMap[attr.name] || attr.name;
		attrs[propName] = attr.value;
	}
	attrs.key = `${id}-${key}`;
	if (element.firstChild === null)
		return (0, import_react.createElement)(element.localName, attrs);
	let childKey = 0;
	return (0, import_react.createElement)(
		element.localName,
		attrs,
		Array.from(element.childNodes)
			.map((c) => {
				if (c.nodeType === Node.TEXT_NODE) return c.data;
				else if (c.nodeType === Node.ELEMENT_NODE) {
					childKey += 1;
					return createReactElementFromDOMElement(c, id, childKey);
				} else return;
			})
			.filter((a) => !!a),
	);
}
function getChildren(childString, experimentalReactChildren) {
	if (experimentalReactChildren && childString) {
		const children = [];
		const template = document.createElement('template');
		template.innerHTML = childString;
		for (const child of template.content.children)
			children.push(createReactElementFromDOMElement(child));
		return children;
	} else if (childString)
		return (0, import_react.createElement)(static_html_default, {
			value: childString,
		});
	else return;
}
var rootMap = /* @__PURE__ */ new WeakMap();
var getOrCreateRoot = (element, creator) => {
	let root = rootMap.get(element);
	if (!root) {
		root = creator();
		rootMap.set(element, root);
	}
	return root;
};
var client_default =
	(element) =>
	(Component, props, { default: children, ...slotted }, { client }) => {
		if (!element.hasAttribute('ssr')) return;
		const actionKey = element.getAttribute('data-action-key');
		const actionName = element.getAttribute('data-action-name');
		const stringifiedActionResult = element.getAttribute('data-action-result');
		const formState =
			actionKey && actionName && stringifiedActionResult
				? [JSON.parse(stringifiedActionResult), actionKey, actionName]
				: void 0;
		const renderOptions = {
			identifierPrefix: element.getAttribute('prefix'),
			formState,
		};
		for (const [key, value] of Object.entries(slotted))
			props[key] = (0, import_react.createElement)(static_html_default, {
				value,
				name: key,
			});
		const componentEl = (0, import_react.createElement)(
			Component,
			props,
			getChildren(children, element.hasAttribute('data-react-children')),
		);
		const rootKey = isAlreadyHydrated(element);
		if (rootKey) delete element[rootKey];
		if (client === 'only')
			return (0, import_react.startTransition)(() => {
				getOrCreateRoot(element, () => {
					const r = (0, import_client.createRoot)(element);
					element.addEventListener('astro:unmount', () => r.unmount(), {
						once: true,
					});
					return r;
				}).render(componentEl);
			});
		(0, import_react.startTransition)(() => {
			getOrCreateRoot(element, () => {
				const r = (0, import_client.hydrateRoot)(
					element,
					componentEl,
					renderOptions,
				);
				element.addEventListener('astro:unmount', () => r.unmount(), {
					once: true,
				});
				return r;
			}).render(componentEl);
		});
	};

export { client_default as default };
