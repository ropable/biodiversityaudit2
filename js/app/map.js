define(["jquery", "underscore", "leaflet", "leaflet_ajax", "config"], function (
	$,
	_,
	L,
	ajax,
	config
) {
	var ControlButton = L.Control.extend({
		options: {
			position: "topleft",
		},
		initialize: function (options) {
			this._button = {};
			this.setButton(options);
		},

		onAdd: function (map) {
			this._map = map;
			var container = L.DomUtil.create("div", "leaflet-control-button");

			this._container = container;

			this._update();
			return this._container;
		},

		onRemove: function (map) {},

		setButton: function (options) {
			var button = {
				text: options.text, //string
				iconUrl: options.iconUrl, //string
				onClick: options.onClick, //callback function
				hideText: !!options.hideText, //forced bool
				maxWidth: options.maxWidth || 70, //number
				doToggle: options.toggle, //bool
				toggleStatus: false, //bool
			};

			this._button = button;
			this._update();
		},

		getText: function () {
			return this._button.text;
		},

		getIconUrl: function () {
			return this._button.iconUrl;
		},

		destroy: function () {
			this._button = {};
			this._update();
		},

		toggle: function (e) {
			if (typeof e === "boolean") {
				this._button.toggleStatus = e;
			} else {
				this._button.toggleStatus = !this._button.toggleStatus;
			}
			this._update();
		},

		_update: function () {
			if (!this._map) {
				return;
			}

			this._container.innerHTML = "";
			this._makeButton(this._button);
		},

		_makeButton: function (button) {
			var newButton = L.DomUtil.create(
				"div",
				"leaflet-buttons-control-button",
				this._container
			);
			if (button.toggleStatus)
				L.DomUtil.addClass(
					newButton,
					"leaflet-buttons-control-toggleon"
				);

			var image = L.DomUtil.create(
				"img",
				"leaflet-buttons-control-img",
				newButton
			);
			image.setAttribute("src", button.iconUrl);

			if (button.text !== "") {
				L.DomUtil.create("br", "", newButton); //there must be a better way

				var span = L.DomUtil.create(
					"span",
					"leaflet-buttons-control-text",
					newButton
				);
				var text = document.createTextNode(button.text); //is there an L.DomUtil for this?
				span.appendChild(text);
				if (button.hideText)
					L.DomUtil.addClass(
						span,
						"leaflet-buttons-control-text-hide"
					);
			}

			L.DomEvent.addListener(newButton, "click", L.DomEvent.stop)
				.addListener(newButton, "click", button.onClick, this)
				.addListener(newButton, "click", this._clicked, this);
			L.DomEvent.disableClickPropagation(newButton);
			return newButton;
		},

		_clicked: function () {
			//'this' refers to button
			if (this._button.doToggle) {
				if (this._button.toggleStatus) {
					//currently true, remove class
					L.DomUtil.removeClass(
						this._container.childNodes[0],
						"leaflet-buttons-control-toggleon"
					);
				} else {
					L.DomUtil.addClass(
						this._container.childNodes[0],
						"leaflet-buttons-control-toggleon"
					);
				}
				this.toggle();
			}
		},
	});

	var regionsProperties = {};

	function buildPopup(properties) {
		const subCode = properties.SUB_CODE;
		const subName = properties.SUB_NAME;
		const regCode = properties.REG_CODE;
		const regName = properties.REG_NAME;

		// Get the PDF info from your dictionary
		const pdfInfo = config.region_pdfs[subCode];

		// Build the full URL
		let pdfUrl;
		if (pdfInfo && pdfInfo.url) {
			// Use the new CKAN URL format
			pdfUrl = `${config.ckan.static_url}/${pdfInfo.url}`;
		} else if (pdfInfo && pdfInfo.fallback_file) {
			// Use local data folder (test mode or fallback)
			pdfUrl = `../pdfs/data/${pdfInfo.fallback_file}.pdf`;
		} else {
			// Last resort fallback to local data folder
			pdfUrl = `../data/pdfs/sub-region-profile-reporting-tables-${subCode.toLowerCase()}.pdf`;
		}

		// Build the popup HTML
		return `<h3>${subCode} ${subName}</h3>
    <p>${regCode} ${regName}</p>
    <a href="${pdfUrl}" class="" title="View the spatial profile for IBRA ${subCode} (as PDF in new tab)" target="_">Spatial Profile IBRA ${subCode}</a>`;
	}

	function addWAControl(map, callback) {
		var buttonOptions = {
			text: "All Western Australia", // string
			iconUrl: "../images/wa.png", // string
			onClick: callback, // callback function
			hideText: false, // bool
			maxWidth: 30, // number
			doToggle: false, // bool
			toggleStatus: false, // bool
		};
		new ControlButton(buttonOptions).addTo(map);
	}

	function initMap(id, onclickHandler) {
		var map = L.map(id, {
			center: [-25, 120],
			zoom: 5,
			zoomControl: false,
			attributionControl: false,
		});

		// Ibra regions layer
		// Use the local file in test mode.
		var ibraURL =
			config.datasource === "test"
				? config.urls.ibra_geojson_test
				: config.urls.ibra_geojson;

		var ibraStyle = {
			color: "#000000",
			weight: 1,
			fillColor: "#E7E7BB",
			fillOpacity: 0,
		};

		var ibraHighlightStyle = {
			color: "#ffffff",
			opacity: 1,
			fillColor: "#CCCCCC",
			fillOpacity: 0,
			weight: 5,
		};

		// Control to display the region code on the bottom left
		var regionLabel;
		var sidebarControl = function () {
			return new (L.Control.extend({
				options: { position: "bottomleft" },
				onAdd: function () {
					regionLabel = L.DomUtil.create("div", "sidebar-control");
					return regionLabel;
				},
			}))();
		};

		/* Background layer */
		L.tileLayer(
			"//kmi.dpaw.wa.gov.au/geoserver/gwc/service/wmts?" +
				"layer=dpaw:mapbox_outdoors&tilematrixset=mercator&Service=WMTS&Request=GetTile&Version=1.0.0" +
				"&Format=image/png&TileMatrix=mercator:{z}&TileCol={x}&TileRow={y}",
			{
				maxZoom: 18,
			}
		).addTo(map);

		// The Ibra layer
		// new L.GeoJSON.AJAX(
		//     ibraURL, {
		//         style: ibraStyle,
		//         onEachFeature: function (feature, layer) {
		//             regionsProperties[feature.properties.SUB_CODE] = feature.properties;
		//             layer.on({
		//                 click: function () {
		//                     if (typeof onclickHandler === 'function') {
		//                         onclickHandler(feature.properties);
		//                     }
		//                 },
		//                 mouseover: function () {
		//                     layer.setStyle(ibraHighlightStyle);
		//                     layer.bringToFront();
		//                     if (regionLabel) {
		//                         regionLabel.innerHTML = feature.properties.SUB_CODE;
		//                     }
		//                 },
		//                 mouseout: function () {
		//                     layer.setStyle(ibraStyle);
		//                     if (regionLabel) {
		//                         regionLabel.innerHTML = '';
		//                     }
		//                 }
		//             });
		//         }
		//     }).addTo(map);
		new L.GeoJSON.AJAX(ibraURL, {
			style: ibraStyle,
			onEachFeature: function (feature, layer) {
				feature.properties.popup = buildPopup(feature.properties);

				regionsProperties[feature.properties.SUB_CODE] =
					feature.properties;
				layer.on({
					click: function () {
						if (typeof onclickHandler === "function") {
							onclickHandler(feature.properties);
						}
					},
					mouseover: function () {
						layer.setStyle(ibraHighlightStyle);
						layer.bringToFront();
						if (regionLabel) {
							regionLabel.innerHTML = feature.properties.SUB_CODE;
						}
					},
					mouseout: function () {
						layer.setStyle(ibraStyle);
						if (regionLabel) {
							regionLabel.innerHTML = "";
						}
					},
				});
			},
		}).addTo(map);

		// Add side-pane control
		map.addControl(sidebarControl());

		// The WA control
		addWAControl(map, function () {
			onclickHandler({
				REG_NAME: "State Level",
				SUB_CODE: "Western Australia",
			});
		});
		return map;
	}

	return {
		init_map: initMap,
		getRegionsProperties: function () {
			return regionsProperties;
		},
	};
});
