// @import Hash
// @requires module/manager.js

Module.Manager.LazyLoader = {

	prototype: {

		lazyLoadModules: function lazyLoadModules(element, overrides) {

			var _options = new Hash({
				scrollElement: null,
				scrollStopDelay: 400,
				scrollTimeout: 250
			});

			var _manager = this;
			var _scrollTimer = null;
			var _scrollElement = _options.scrollElement || null;
			var _element = element;
			var _document = _element.ownerDocument;
			var _scrollLeft = 0;
			var _scrollTop = 0;

			function init() {
				if (_manager.stopLazyLoadingModules) {
					_manager.stopLazyLoadingModules();
				}

				if (overrides) {
					_options.merge(overrides);
				}

				addEvents();

				initModulesInsideViewport();

				if (!_scrollElement.scrollTop && !_scrollElement.scrollLeft) {
					// Not all browsers agree on the _scrollElement. We are at the
					// top of the page so we don't know whether the browser is
					// scrolling the <html> or <body> tag. Defer judgement until
					// the user has scrolled.
					_scrollElement = null;
				}
			}

			function destructor() {
				if (_element) {
					removeEvents();
					_element = _document = _scrollElement = null;
				}

				if (_scrollTimer) {
					clearTimeout(_scrollTimer);
					_scrollTimer = null;
				}

				if (_options) {
					_options.destructor();
					_options = null;
				}

				_manager.stopLazyLoadingModules = _manager = null;

				return this;
			}

			function addEvent(element, name, listener) {
				if (element.addEventListener) {
					element.addEventListener(name, listener, true);
				}
				else if (name === "scroll") {
					element.onscroll = listener;
				}
				else {
					element.attachEvent("on" + name, listener);
				}
			}

			function addEvents() {
				addEvent(_element, "mouseover", handleMouseOverEvent);
				addEvent(_document, "scroll", handleScrollEvent);
			}

			function initModulesInsideViewport() {
				var elements = _element.getElementsByTagName("*"), i, element;
				var viewport = Viewport.create(getScrollElement());

				for (i = 0; i < elements.length; i++) {
					element = elements[i];

					if (element.getAttribute("data-module-lazyload") && viewport.isVisible(element)) {
						lazyLoadModules(element, "scrollto");
					}
				}
			}

			function getScrollElement() {
				if (_scrollElement === null) {
					if (_document.body.scrollTop || _document.body.scrollLeft) {
						_scrollElement = _document.body;
					}
					else {
						_scrollElement = _document.documentElement;
					}
				}

				return _scrollElement;
			}

			function handleMouseOverEvent(event) {
				event = event || window.event;
				event.target = event.target || event.srcElement;

				if (event.target.getAttribute("data-module-lazyload")) {
					lazyLoadModules(event.target, event.type);
				}
			}

			function handleScrollEvent(event) {
				removeEvent(_document, "scroll", handleScrollEvent);

				if (_scrollTimer) {
					clearInterval(_scrollTimer);
				}

				_scrollTimer = setInterval(checkScrollPosition, _options.scrollTimeout);
			}

			function checkScrollPosition() {
				var scrollElement = getScrollElement(),
				    newScrollLeft = scrollElement.scrollLeft,
				    newScrollTop = scrollElement.scrollTop;

				if (newScrollLeft != _scrollLeft || newScrollTop != _scrollTop) {
					clearInterval(_scrollTimer);
					addEvent(_document, "scroll", handleScrollEvent);
					_scrollLeft = newScrollLeft;
					_scrollTop = newScrollTop;
					initModulesInsideViewport();
				}
			}

			function lazyLoadModules(element, value) {
				var attr = element.getAttribute("data-module-lazyload");

				if (attr === "any" || new RegExp(value).test(attr)) {
					element.removeAttribute("data-module-lazyload");
					_manager.createModules(element);
					element.setAttribute("data-module-lazyloaded", attr);
				}

				element = null;
			}

			function removeEvent(element, name, listener) {
				if (element.removeEventListener) {
					element.removeEventListener(name, listener, true);
				}
				else if (name === "scroll") {
					element.onscroll = null;
				}
				else {
					element.detachEvent("on" + name, listener);
				}
			}

			function removeEvents() {
				removeEvent(_element, "mouseover", handleMouseOverEvent);
				removeEvent(_document, "scroll", handleScrollEvent);
			}

			// internal class for viewport logic
			function Viewport() {}
			Viewport.prototype = {
				bottom: 0,
				height: 0,
				left: 0,
				right: 0,
				top: 0,
				width: 0,

				constructor: Viewport,

				isBottomInBounds: function isBottomInBounds(position) {
					return (position.top + position.height <= this.top + this.height && position.top + position.height > this.top) ? true : false;
				},

				isLeftInBounds: function isLeftInBounds(position) {
					return (position.left >= this.left && position.left < this.left + this.width) ? true : false;
				},

				isRightInBounds: function isRightInBounds(position) {
					return (position.left + position.width <= this.left + this.width && position.left + position.width > this.left) ? true : false;
				},

				isTopInBounds: function isTopInBounds(position) {
					return (position.top >= this.top && position.top < this.top + this.height) ? true : false;
				},

				isVisible: function isVisible(element) {
					var visible = false;
					var position = this._getPosition(element);

					if ((this.isRightInBounds(position) || this.isLeftInBounds(position)) && (this.isTopInBounds(position) || this.isBottomInBounds(position))) {
						visible = true;
					}

					return visible;
				},

				_getPosition: function _getPosition(element) {
					var parent = element.offsetParent;
					var position = {
						top: element.offsetTop,
						left: element.offsetLeft,
						width: element.offsetWidth,
						height: element.offsetHeight
					};

					while(parent = parent.offsetParent) {
						position.top += parent.offsetTop;
						position.left += parent.offsetLeft;
					}

					return position;
				}
			};
			Viewport.create = function create(element) {
				var viewport = new this();

				viewport.top = element.scrollTop;
				viewport.left = element.scrollLeft;
				viewport.width = element.clientWidth;
				viewport.height = element.clientHeight;
				viewport.right = element.offsetWidth - (viewport.left + viewport.width);
				viewport.bottom = element.offsetHeight - viewport.top - viewport.height;

				return viewport;
			};

			// start lazy loading modules
			init();

			// expose public method to clean up this function closure
			this.stopLazyLoadingModules = destructor;

			return this;
		}

	}

};

Module.Manager.include(Module.Manager.LazyLoader);
