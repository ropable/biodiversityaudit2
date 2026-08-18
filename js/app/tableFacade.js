define(["underscore", "jquery", "datatables"], function (_, $, DataTable) {
	"use strict";

	var defaultOptions = {
		paging: true,
		info: true,
		searching: true,
		scrollCollapse: true,
		processing: true,
		deferRender: true,
		autoWidth: true,
	};

	function decorateTable(table) {
		table.get_data_fields = function () {
			// DataTables 3 renamed settings.aoColumns to settings.columns.
			var settings = this.settings()[0];
			var columns = settings.columns || settings.aoColumns || [];
			return columns.map(function (x) {
				return x.data;
			});
		};
		// Check that all column values are there.
		// Missing values are added as ''
		table.validate_row = function (row) {
			var fields = table.get_data_fields(),
				missing_columns = fields.filter(function (x) {
					var is_dot_notation = _.contains(x, "."); // don't support dot notation
					return !is_dot_notation && row[x] === undefined;
				}),
				column_filler = {},
				column,
				i;

			for (i = 0; i < missing_columns.length; i += 1) {
				column = missing_columns[i];
				column_filler[column] = "";
			}
			return $.extend(row, column_filler);
		};

		table.populate = function (json) {
			var data = [];
			if (json) {
				if (typeof json === "string") {
					// $.parseJSON was removed in jQuery 4.
					data = JSON.parse(json);
				} else {
					data = json;
				}
				var rows = data.map(table.validate_row);
				table.rows.add(rows).draw();
			}
		};

		table.fetch = function (url) {
			$.ajax({
				url: url,
				dataType: "json",
				success: function (data) {
					table.populate(data);
				},
			});
		};

		return table;
	}

	return {
		initTable: function (selector, tableOptions, columnsOptions) {
			var options = {},
				table;
			// DataTables 3 no longer attaches itself to jQuery on load, so
			// $.fn.DataTable only exists once jQuery is registered.
			if (DataTable.use) {
				DataTable.use($);
			}
			DataTable.ext.errMode = "throws"; // console error instead of an alert
			$.extend(options, defaultOptions, tableOptions, {
				columns: columnsOptions,
			});
			try {
				table = new DataTable(selector, options);
			} catch (e) {
				console.log("DataTable constructor failed:", e.message);
				table = $(selector).DataTable(options);
			}
			// add some methods
			table = decorateTable(table);
			return table;
		},
	};
});
